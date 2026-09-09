"""Render the website's exported, deformed meshes in Blender 4.5+.

blender -b --factory-startup --python scripts/blender-audit.py -- EXPORT_DIR [orders]
No remeshing, pose changes or automatic repairs are applied.
"""
import bpy
import json
import math
import sys
from pathlib import Path
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

args = sys.argv[sys.argv.index('--') + 1:]
root = Path(args[0]).resolve()
selection = {int(n) for n in args[1].split(',')} if len(args) > 1 else None
inventory = json.loads((root / 'inventory.json').read_text(encoding='utf-8'))
indices = np.fromfile(root / 'indices.bin', dtype=np.uint32).reshape(-1, 3)
colors = np.fromfile(root / 'colors.bin', dtype=np.float32).reshape(-1, 3)
rest = np.fromfile(root / 'rest.bin', dtype=np.float32).reshape(-1, 3)
rest_cross = np.cross(rest[indices[:, 1]] - rest[indices[:, 0]], rest[indices[:, 2]] - rest[indices[:, 0]])
rest_area = np.linalg.norm(rest_cross, axis=1) / 2
render_dir = root / 'renders'
render_dir.mkdir(exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.eevee.taa_render_samples = 24
scene.render.resolution_x = 420
scene.render.resolution_y = 420
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast' if 'Medium High Contrast' in [x.name for x in scene.view_settings.bl_rna.properties['look'].enum_items] else 'None'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.64, 0.68, 0.62, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.55

material = bpy.data.materials.new('Website vertex colors')
material.use_nodes = True
material.use_backface_culling = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
vertex_color = material.node_tree.nodes.new('ShaderNodeVertexColor')
vertex_color.layer_name = 'Color'
material.node_tree.links.new(vertex_color.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.76
bsdf.inputs['Metallic'].default_value = 0.06

floor_material = bpy.data.materials.new('Neutral audit floor')
floor_material.diffuse_color = (0.72, 0.75, 0.68, 1)
bpy.ops.mesh.primitive_plane_add(size=200)
floor = bpy.context.object
floor.name = 'Ground at website Y=0'
floor.data.materials.append(floor_material)

for name, location, power, size in [
    ('Key', (3, -4, 6), 850, 5),
    ('Fill', (-4, -1, 3), 450, 4),
    ('Rim', (1, 4, 5), 650, 3),
]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, 0.8)) - light.location).to_track_quat('-Z', 'Y').to_euler()

camera_data = bpy.data.cameras.new('Audit camera')
camera = bpy.data.objects.new('Audit camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.clip_end = 1000

def blender_coordinates(v):
    return np.column_stack((v[:, 0], -v[:, 2], v[:, 1]))

reports = []
report_path = root / 'blender-report.json'
if report_path.exists():
    reports = json.loads(report_path.read_text(encoding='utf-8'))['models']
for entry in inventory:
    if selection and entry['order'] not in selection:
        continue
    vertices = np.fromfile(root / (entry['id'] + '.bin'), dtype=np.float32).reshape(-1, 3)
    normals = np.fromfile(root / (entry['id'] + '.normals.bin'), dtype=np.float32).reshape(-1, 3)
    if not np.isfinite(vertices).all() or not np.isfinite(normals).all():
        raise ValueError('Non-finite geometry: ' + entry['id'])
    cross = np.cross(vertices[indices[:, 1]] - vertices[indices[:, 0]], vertices[indices[:, 2]] - vertices[indices[:, 0]])
    area = np.linalg.norm(cross, axis=1) / 2
    valid = (area > 1e-10) & (rest_area > 1e-10)
    normal_dot = (cross * normals[indices].mean(axis=1)).sum(axis=1)
    report = {
        'id': entry['id'], 'order': entry['order'], 'style': entry['style'],
        'meshSha256': entry['meshSha256'], 'vertices': len(vertices), 'triangles': len(indices),
        'finite': True, 'lowestVertexMetres': float(vertices[:, 1].min()),
        'newCollapsedTriangles': int(((area <= 1e-10) & (rest_area > 1e-10)).sum()),
        'opposingSurfaceNormals': int(((normal_dot < -1e-10) & valid).sum()),
        'maxTriangleAreaRatio': float((area[valid] / rest_area[valid]).max()),
        'renders': [],
    }
    converted = blender_coordinates(vertices)
    mesh = bpy.data.meshes.new(entry['id'])
    mesh.from_pydata(converted.tolist(), [], indices.tolist())
    mesh.update()
    # Validate a copy: diagnostics must not repair or change the rendered source.
    check = mesh.copy()
    report['blenderValidationWouldChangeMesh'] = bool(check.validate(verbose=False))
    bpy.data.meshes.remove(check)
    color = mesh.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    color.data.foreach_set('color', np.column_stack((colors, np.ones(len(colors)))).astype(np.float32).ravel())
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    mesh.normals_split_custom_set_from_vertices(blender_coordinates(normals).tolist())
    obj = bpy.data.objects.new(entry['id'], mesh)
    scene.collection.objects.link(obj)
    mesh.materials.append(material)
    obj['source_image'] = entry['imageId']
    obj['source_mesh_sha256'] = entry['meshSha256']
    center = (converted.min(axis=0) + converted.max(axis=0)) / 2
    for label, yaw in [('front', 0), ('side', 90), ('rear', -135)]:
        radians = math.radians(yaw)
        elevation = math.radians(8)
        toward = np.array((math.sin(radians)*math.cos(elevation), -math.cos(radians)*math.cos(elevation), math.sin(elevation)))
        right = np.array((math.cos(radians), math.sin(radians), 0))
        up = np.cross(toward, right)
        projected = converted @ np.column_stack((right, up))
        size = float(np.ptp(projected, axis=0).max())
        projected_center = (projected.min(axis=0) + projected.max(axis=0)) / 2
        target = center + right * (projected_center[0] - center @ right) + up * (projected_center[1] - center @ up)
        camera.location = Vector(target + toward * 7)
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.ortho_scale = size * 1.18
        bpy.context.view_layer.update()
        extreme = np.unique(np.concatenate((projected.argmin(axis=0), projected.argmax(axis=0))))
        frame_points = [world_to_camera_view(scene, camera, Vector(converted[i])) for i in extreme]
        margins = [min(p.x, p.y, 1-p.x, 1-p.y) for p in frame_points]
        if min(margins) < 0.02:
            raise ValueError(f'Camera clips {entry["id"]} {label}: {margins}')
        filename = f"{entry['order']:03}-{entry['id']}-{label}.png"
        scene.render.filepath = str(render_dir / filename)
        bpy.ops.render.render(write_still=True)
        report['renders'].append('renders/' + filename)
    if entry['order'] in (8, 47, 94):
        bpy.ops.wm.save_as_mainfile(filepath=str(root / f"{entry['order']:03}-{entry['id']}.blend"), compress=True)
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(mesh)
    reports = [r for r in reports if r['id'] != report['id']] + [report]
    report_path.write_text(json.dumps({
        'blenderVersion': bpy.app.version_string, 'engine': scene.render.engine,
        'samples': scene.eevee.taa_render_samples,
        'coordinates': 'Three.js (x,y,z) -> Blender (x,-z,y); metres; floor at 0',
        'normals': 'Website skin shader normals, without geometry repair',
        'backfaceCulling': True,
        'models': sorted(reports, key=lambda r: r['order']),
    }, indent=2) + '\n', encoding='utf-8')
    print('AUDIT_DONE', entry['style'], entry['order'], entry['id'], json.dumps(report), flush=True)
