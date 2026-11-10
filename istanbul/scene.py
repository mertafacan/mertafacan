"""Blender: builds the terrain (real DEM) and every landmark from simple shapes, toon colours, inverted-hull ink.
blender -b -P scene.py -- --data data   -> data/world.glb   (landmarks carry their build year in custom property `born`)"""
import bpy, bmesh, math, json, sys, os
import numpy as np
from mathutils import Vector, Matrix
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import geo
DATA = os.path.join(HERE, 'data')
bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene
C = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
def P(x, y, z): return Vector((x, -z, y))
def rot3(rx=0, ry=0, rz=0): return (C @ (Matrix.Rotation(ry, 3, 'Y') @ Matrix.Rotation(rx, 3, 'X') @ Matrix.Rotation(rz, 3, 'Z')) @ C.inverted()).to_euler()
def hexc(h):
    h = h.lstrip('#'); f = lambda c: ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92
    return tuple(f(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)
_m = {}
def M(c, rough=0.45, emit=None, es=1.0):
    k = (c, rough, emit, es)
    if k not in _m:
        m = bpy.data.materials.new('m'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = hexc(c); b.inputs['Roughness'].default_value = rough
        if emit: b.inputs['Emission Color'].default_value = hexc(emit); b.inputs['Emission Strength'].default_value = es
        _m[k] = m
    return _m[k]
INK = bpy.data.materials.new('Ink'); INK.use_nodes = True; INK.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = hexc('#2a1a2e'); INK.use_backface_culling = True
def link(o):
    for c in list(o.users_collection): c.objects.unlink(o)
    scene.collection.objects.link(o)
def fin(o, name, pos, rot, mat, ink, parent, smooth=False):
    o.name = name; link(o); o.location = P(*pos)
    if rot: o.rotation_euler = rot3(*rot)
    o.data.materials.clear(); o.data.materials.append(mat)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    if ink:
        o.data.materials.append(INK); s = o.modifiers.new('Ink', 'SOLIDIFY'); s.thickness = ink; s.offset = 1.0; s.use_flip_normals = True; s.material_offset = 1; s.use_rim = False
    if parent is not None: o.parent = parent
    return o
def box(name, s, pos, mat, rot=None, ink=0.0025, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.active_object; o.scale = (s[0], s[2], s[1]); bpy.ops.object.transform_apply(scale=True)
    return fin(o, name, pos, rot, mat, ink, parent)
def cyl(name, r, h, pos, mat, r2=None, rot=None, ink=0.0025, parent=None, v=16):
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=(r if r2 is None else r2), depth=h, vertices=v); o = bpy.context.active_object
    return fin(o, name, pos, rot, mat, ink, parent, smooth=True)
def dome(name, r, pos, mat, sq=0.75, ink=0.0025, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=16, ring_count=8); o = bpy.context.active_object; o.scale = (1, 1, sq); bpy.ops.object.transform_apply(scale=True)
    me = o.data; bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS'); bm.to_mesh(me); bm.free()
    return fin(o, name, pos, None, mat, ink, parent, smooth=True)
def empty(name, pos, born=None, parent=None):
    e = bpy.data.objects.new(name, None); link(e); e.location = P(*pos)
    if born is not None: e['born'] = born
    if parent is not None: e.parent = parent
    return e

# ------------------------------------------------------------------ terrain from the real DEM
T = np.load(os.path.join(DATA, 'terrain.npz')); h = T['h']; col = T['col']; Hg, Wg = h.shape
xs = np.linspace(-geo.SX / 2, geo.SX / 2, Wg); zs = np.linspace(-geo.SZ / 2, geo.SZ / 2, Hg)
X, Z = np.meshgrid(xs, zs)
verts = np.stack([X.ravel(), -Z.ravel(), h.ravel()], 1).astype(np.float32)
idx = (np.arange(Hg - 1)[:, None] * Wg + np.arange(Wg - 1)[None, :]).ravel()
faces = np.stack([idx, idx + 1, idx + Wg + 1, idx + Wg], 1)
faces = faces[:, ::-1]   # normals up (+Z in Blender), north row first
me = bpy.data.meshes.new('terrain'); me.from_pydata(verts.tolist(), [], faces.tolist()); me.update()
ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT'); rgba = np.concatenate([col.reshape(-1, 3), np.ones((Hg * Wg, 1), np.float32)], 1); ca.data.foreach_set('color', rgba.ravel())
for p in me.polygons: p.use_smooth = True
ter = bpy.data.objects.new('terrain', me); link(ter)
tm = bpy.data.materials.new('terrain'); tm.use_nodes = True; nt = tm.node_tree; b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.9
an = nt.nodes.new('ShaderNodeVertexColor'); an.layer_name = 'Col'; nt.links.new(an.outputs['Color'], b.inputs['Base Color']); me.materials.append(tm)

# ------------------------------------------------------------------ landmarks
LM = {}
def lm(name, lat, lon, born, dy=0.0, ry=0.0):
    x, z = geo.ll(lat, lon); y = float(geo.hgt(x, z)) + dy; e = empty(name, (x, max(y, 0.0), z), born); e.rotation_euler = rot3(0, ry, 0); LM[name] = e; return e
WALL, STONE, ROOF, LEAD, GOLD, TERRA, WHITE, DARK = '#e9c9a0', '#c9b79a', '#c85a3a', '#8c9bb5', '#f0c040', '#d98a5a', '#f4efe2', '#6e5a4a'
def minaret(par, x, z, hh, born=None, s=1.0, mat=WHITE):
    e = empty('minaret', (x, 0, z), born, par)
    cyl('shaft', 0.0032 * s, hh, (0, hh / 2, 0), M(mat), parent=e, v=10, ink=0.0012); box('balc', (0.0095 * s, 0.002, 0.0095 * s), (0, hh * 0.78, 0), M(STONE), parent=e, ink=0.0008)
    cyl('cap', 0.0042 * s, 0.017 * s, (0, hh + 0.0085 * s, 0), M('#7d8fae'), r2=0.0, parent=e, v=10, ink=0.001)
def mosque(name, lat, lon, born, scale=1.0, minarets=((1, 1), (-1, 1), (1, -1), (-1, -1)), tall=0.060, ry=0.0, mnborn=None, wall=STONE, domec=LEAD):
    e = lm(name, lat, lon, born, ry=ry); s = scale
    box('hall', (0.052 * s, 0.026 * s, 0.052 * s), (0, 0.013 * s, 0), M(wall), parent=e)
    dome('maindome', 0.0245 * s, (0, 0.026 * s, 0), M(domec), parent=e)
    for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)): dome('half', 0.015 * s, (dx * 0.03 * s, 0.022 * s, dz * 0.03 * s), M(domec), parent=e)
    for sx_, sz_ in ((1, 1), (-1, 1), (1, -1), (-1, -1)): dome('small', 0.008 * s, (sx_ * 0.034 * s, 0.026 * s, sz_ * 0.034 * s), M(domec), parent=e)
    for dx, dz in minarets: minaret(e, dx * 0.05 * s, dz * 0.05 * s, tall * s, mnborn)
    return e
# Hagia Sophia (church 537; minarets added after 1453)
e = lm('ayasofya', 41.0086, 28.9802, 537, ry=0.55)
box('body', (0.075, 0.032, 0.068), (0, 0.016, 0), M(TERRA), parent=e); dome('dome', 0.0255, (0, 0.032, 0), M(LEAD), sq=0.8, parent=e)
for sx_ in (-1, 1): dome('semi', 0.0175, (sx_ * 0.036, 0.026, 0), M(LEAD), parent=e)
for sx_, sz_ in ((1, 1), (-1, 1), (1, -1), (-1, -1)): box('buttress', (0.012, 0.038, 0.014), (sx_ * 0.034, 0.019, sz_ * 0.038), M(WALL), parent=e)
for sx_, sz_ in ((1, 1), (-1, 1), (1, -1), (-1, -1)): minaret(e, sx_ * 0.054, sz_ * 0.05, 0.056, 1453)
# Sultanahmet (Blue) Mosque 1616, Süleymaniye 1557, Yeni Cami 1665, Fatih 1470, Şehzade
mosque('sultanahmet', 41.0054, 28.9768, 1616, 1.05, minarets=((1.2, 1), (-1.2, 1), (1.2, -1), (-1.2, -1), (1.5, 0.0), (-1.5, 0.0)), tall=0.064, ry=0.55)
mosque('suleymaniye', 41.0162, 28.9640, 1557, 1.15, tall=0.068, ry=0.35)
mosque('yenicami', 41.0165, 28.9709, 1665, 0.8, minarets=((1, 1), (-1, -1)), ry=0.2)
mosque('fatih', 41.0190, 28.9500, 1470, 0.95, minarets=((1, 1), (-1, -1)), ry=0.3)
# Constantine's column, Hippodrome (a long U track), Valens aqueduct
e = lm('column', 41.0087, 28.9712, 330); cyl('c', 0.0026, 0.034, (0, 0.017, 0), M(STONE), parent=e, v=10, ink=0.001)
e = lm('hippodrome', 41.0057, 28.9752, 203, ry=1.2)
for sgn in (-1, 1): box('side', (0.42, 0.011, 0.01), (0, 0.0055, sgn * 0.055), M(STONE), parent=e)
box('end', (0.01, 0.011, 0.12), (0.21, 0.0055, 0), M(STONE), parent=e)
for k in range(4): cyl('obelisk', 0.0022, 0.02, (-0.1 + k * 0.07, 0.01, 0), M('#d6a86a'), r2=0.001, parent=e, v=4, ink=0.0008)
e = lm('aqueduct', 41.0178, 28.9570, 368, ry=2.1)
for k in range(14): box('pier', (0.0075, 0.025, 0.006), (-0.14 + k * 0.021, 0.0125, 0), M(STONE), parent=e, ink=0.0012); box('arch', (0.021, 0.004, 0.006), (-0.14 + k * 0.021 + 0.0105, 0.027, 0), M(STONE), parent=e, ink=0.0012)
# Theodosian land walls (413): towers every 70 m along the real line
wall_pts = [(40.9930, 28.9225), (41.0050, 28.9203), (41.0140, 28.9215), (41.0250, 28.9298), (41.0340, 28.9372), (41.0450, 28.9420)]
wp = [geo.ll(a, b) for a, b in wall_pts]
for k in range(len(wp) - 1):
    (x0, z0), (x1, z1) = wp[k], wp[k + 1]; L = math.hypot(x1 - x0, z1 - z0); n = max(2, int(L / 0.07)); ang = math.atan2(-(z1 - z0), (x1 - x0))
    for j in range(n):
        u = (j + 0.5) / n; x = x0 + (x1 - x0) * u; z = z0 + (z1 - z0) * u; y = float(geo.hgt(x, z)); e = empty('wallseg', (x, y, z), 413)
        box('w', (L / n * 1.02, 0.014, 0.006), (0, 0.007, 0), M(WALL), rot=(0, math.atan2(-(z1 - z0), (x1 - x0)) * -1, 0), parent=e, ink=0.0014)
        box('t', (0.011, 0.02, 0.011), (0, 0.01, 0), M(STONE), rot=(0, 0, 0), parent=e, ink=0.0014)
# Galata tower (1348), Maiden's tower (1110), Rumeli Hisari (1452), Anadolu Hisari (1394)
e = lm('galata', 41.0256, 28.9742, 1348); cyl('t', 0.0085, 0.052, (0, 0.026, 0), M(STONE), parent=e); cyl('top', 0.0105, 0.012, (0, 0.058, 0), M(DARK), parent=e); cyl('cap', 0.012, 0.016, (0, 0.072, 0), M('#7d8fae'), r2=0.0, parent=e)
e = lm('kizkulesi', 41.0211, 29.0041, 1110, dy=0.0); cyl('t', 0.0055, 0.022, (0, 0.011, 0), M(WALL), parent=e); cyl('cap', 0.0075, 0.009, (0, 0.026, 0), M('#7d8fae'), r2=0.0, parent=e); box('isle', (0.03, 0.003, 0.03), (0, 0.0015, 0), M(STONE), parent=e)
e = lm('rumelihisari', 41.0852, 29.0560, 1452, ry=0.4)
for k, (x, z) in enumerate(((-0.09, 0.0), (0.0, 0.0), (0.09, 0.0))): cyl('tw', 0.012 + 0.002 * (k == 1), 0.045, (x, 0.022, z), M(WALL), parent=e); cyl('cap', 0.014, 0.012, (x, 0.05, z), M('#7d8fae'), r2=0.0, parent=e)
box('wall', (0.22, 0.016, 0.006), (0, 0.008, 0.01), M(WALL), parent=e)
e = lm('anadolu', 41.0827, 29.0661, 1394); cyl('t', 0.008, 0.03, (0, 0.015, 0), M(WALL), parent=e); box('w', (0.06, 0.012, 0.01), (0, 0.006, 0.02), M(WALL), parent=e)
# Topkapi Palace (1478): low courtyards with small domes
e = lm('topkapi', 41.0115, 28.9833, 1478, ry=0.4)
for k in range(5):
    box('court', (0.05, 0.012, 0.04), (-0.1 + k * 0.05, 0.006, 0.0 if k % 2 == 0 else 0.03), M(WALL), parent=e); dome('d', 0.008, (-0.1 + k * 0.05, 0.012, 0.0 if k % 2 == 0 else 0.03), M(LEAD), parent=e)
cyl('tower', 0.008, 0.045, (0.12, 0.022, 0.02), M(STONE), parent=e); cyl('cap', 0.01, 0.01, (0.12, 0.05, 0.02), M('#7d8fae'), r2=0, parent=e)
# Dolmabahce (1856), Haydarpasa (1908)
e = lm('dolmabahce', 41.0392, 29.0006, 1856, ry=-0.15); box('p', (0.28, 0.025, 0.045), (0, 0.0125, 0), M('#f1e3cc'), parent=e); box('c', (0.06, 0.036, 0.05), (0, 0.018, 0), M('#f1e3cc'), parent=e); dome('d', 0.014, (0, 0.036, 0), M(LEAD), parent=e); box('g', (0.12, 0.004, 0.003), (0, 0.003, 0.05), M(GOLD), parent=e)
e = lm('haydarpasa', 40.9965, 29.0189, 1908, ry=0.35); box('b', (0.16, 0.02, 0.07), (0, 0.01, 0), M('#d9c3a2'), parent=e)
for sx_ in (-1, 1): cyl('t', 0.012, 0.045, (sx_ * 0.075, 0.022, 0.0), M('#d9c3a2'), parent=e); cyl('c', 0.015, 0.014, (sx_ * 0.075, 0.05, 0.0), M('#7d8fae'), r2=0, parent=e)
# bridges: Galata (1845), Bosphorus (1973), FSM (1988), Yavuz Sultan Selim (2016)
def bridge(name, a, b, born, tower_h, deck_y, w=0.018, cables=True, towers=2):
    (x0, z0), (x1, z1) = geo.ll(*a), geo.ll(*b); L = math.hypot(x1 - x0, z1 - z0); ang = math.atan2(z1 - z0, x1 - x0)
    e = empty(name, ((x0 + x1) / 2, 0, (z0 + z1) / 2), born); e.rotation_euler = rot3(0, -ang, 0)
    box('deck', (L, 0.004, w), (0, deck_y, 0), M('#d7d9de'), parent=e, ink=0.0016)
    if cables:
        for k in range(towers):
            tx = (-0.28 + k * 0.56) * L if towers == 2 else 0
            for sz_ in (-1, 1): box('tower', (0.005, tower_h, 0.005), (tx, deck_y + tower_h / 2, sz_ * w * 0.6), M('#dd3b3b'), parent=e, ink=0.0014)
            box('beam', (0.004, 0.004, w * 1.3), (tx, deck_y + tower_h * 0.9, 0), M('#dd3b3b'), parent=e, ink=0.0012)
        for k in range(1, 22):
            u = (k / 22 - 0.5) * L; q = abs(u) / (L / 2)
            for sz_ in (-1, 1): box('hang', (0.0012, max(0.004, tower_h * (0.9 - 0.8 * (1 - (2 * abs(abs(u) - 0.28 * L) / L) ** 0.5 if False else 0) - 0.55 * abs(abs(u) - 0.28 * L) / (L * 0.5))), 0.0012), (u, deck_y + 0.002 + 0.2 * tower_h, sz_ * w * 0.55), M('#f0f0f0'), parent=e, ink=0)
    return e
bridge('galatabridge', (41.0207, 28.9738), (41.0175, 28.9708), 1845, 0.0, 0.003, w=0.014, cables=False)
bridge('bosphorus1', (41.0480, 29.0270), (41.0420, 29.0450), 1973, 0.105, 0.065, w=0.03)
bridge('fsm', (41.0935, 29.0555), (41.0890, 29.0700), 1988, 0.11, 0.07, w=0.03)
bridge('yavuz', (41.2062, 29.0920), (41.2052, 29.1235), 2016, 0.32, 0.07, w=0.03)
# Istanbul Airport (2018): runways + terminal
e = lm('airport', 41.2606, 28.7420, 2018)
for k in range(3): box('rw', (0.9, 0.0015, 0.045), (0, 0.001, -0.4 + k * 0.4), M('#6a6f78'), parent=e, ink=0.0012)
box('term', (0.35, 0.02, 0.12), (0, 0.01, 0.0), M('#e8eaee'), parent=e); box('roof', (0.37, 0.004, 0.14), (0, 0.022, 0.0), M('#5aa6c8'), parent=e)
# Golden Horn chain (1453) — hidden except during the siege (the timeline toggles it)
(cx0, cz0), (cx1, cz1) = geo.ll(41.0236, 28.9760), geo.ll(41.0273, 28.9712)
ch = empty('chain', ((cx0 + cx1) / 2, 0.0004, (cz0 + cz1) / 2), -9999)
for k in range(22):
    u = k / 21; box('link', (0.006, 0.003, 0.006), ((u - 0.5) * (cx1 - cx0), 0.0, (u - 0.5) * (cz1 - cz0)), M('#3a3a40'), parent=ch, ink=0.0008)

for o in bpy.data.objects:                       # custom props -> glTF extras
    pass
scene.view_settings.view_transform = 'Standard'
out = os.path.join(DATA, 'world.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_extras=True, export_cameras=False, export_lights=False, export_yup=True,
                          export_texcoords=False, export_normals=True, export_materials='EXPORT', export_vertex_color='MATERIAL', use_selection=False, export_animations=False)
print('EXPORTED', out, os.path.getsize(out) // 1024, 'KB')
