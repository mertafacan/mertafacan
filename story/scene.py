"""Blender scene script.  blender -b -P scene.py -- --data data
Builds every place of the story from simple shapes (boxes, cylinders, cones, tori, bevelled boxes),
flat toon colours, low roughness, an inverted-hull ink outline on every object, canvas textures for
signs / boards / brick / planks, practical lights.  Then exports the whole world as data/scene.glb
(modifiers applied) which the three.js renderer loads.  Coordinates in this file are Y-up metres
(same as layout.json); P() converts to Blender's Z-up.
"""
import bpy, bmesh, math, json, sys, os, random
from mathutils import Vector, Matrix, Euler

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
DATA = os.path.abspath(argv[argv.index('--data') + 1]) if '--data' in argv else os.path.abspath('data')
HERE = os.path.dirname(os.path.abspath(__file__))
LAYOUT = json.load(open(os.path.join(HERE, 'layout.json')))
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- coordinate helpers
C = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
def P(x, y, z): return Vector((x, -z, y))
def hexc(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92  # sRGB -> linear
    return (f(r), f(g), f(b), 1.0)
def rot3(rx=0, ry=0, rz=0):
    R = (Matrix.Rotation(ry, 3, 'Y') @ Matrix.Rotation(rx, 3, 'X') @ Matrix.Rotation(rz, 3, 'Z'))
    return (C @ R @ C.inverted()).to_euler()

# ---------------------------------------------------------------- materials
_mats = {}; _imgs = {}
def image(name):
    if name not in _imgs:
        _imgs[name] = bpy.data.images.load(os.path.join(DATA, 'textures', name + '.png'))
    return _imgs[name]

def mat(name, color='#cccccc', tex=None, rough=0.38, emit=None, estr=1.0, metal=0.0, alpha=None):
    key = (name, color, tex, rough, emit, estr, metal, alpha)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = hexc(color)
    bsdf.inputs['Roughness'].default_value = rough; bsdf.inputs['Metallic'].default_value = metal
    if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0.35
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = image(tex); t.interpolation = 'Linear'
        nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
        if alpha is not None or tex == 'cloud':
            nt.links.new(t.outputs['Alpha'], bsdf.inputs['Alpha']); m.blend_method = 'BLEND'
        if emit == 'tex':
            nt.links.new(t.outputs['Color'], bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = estr
    if emit and emit != 'tex':
        bsdf.inputs['Emission Color'].default_value = hexc(emit); bsdf.inputs['Emission Strength'].default_value = estr
    if alpha is not None and not tex:
        bsdf.inputs['Alpha'].default_value = alpha; m.blend_method = 'BLEND'
    _mats[key] = m; return m

INK = bpy.data.materials.new('Ink'); INK.use_nodes = True
INK.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = hexc('#2a1a2e')
INK.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
INK.use_backface_culling = True   # backface-only shell = ink line

# ---------------------------------------------------------------- object helpers
ALL = []
def collection_link(o):
    for c in list(o.users_collection): c.objects.unlink(o)
    scene.collection.objects.link(o)

def uv_box(o, tile):
    me = o.data
    if not me.uv_layers: me.uv_layers.new(name='UVMap')
    uv = me.uv_layers.active.data
    for poly in me.polygons:
        n = poly.normal; a = max(range(3), key=lambda i: abs(n[i]))
        ax = [i for i in range(3) if i != a]
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            u, v = co[ax[0]], co[ax[1]]
            if a == 0: u, v = co[1], co[2]
            elif a == 1: u, v = co[0], co[2]
            else: u, v = co[0], co[1]
            uv[li].uv = (u * tile, v * tile)

def uv_front(o, face_dir=(0, -1, 0)):
    """full 0..1 uv on the face whose normal is face_dir (Blender space), tiny uv on the rest."""
    me = o.data
    if not me.uv_layers: me.uv_layers.new(name='UVMap')
    uv = me.uv_layers.active.data
    xs = [v.co[0] for v in me.vertices]; zs = [v.co[2] for v in me.vertices]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    for poly in me.polygons:
        front = (Vector(poly.normal) - Vector(face_dir)).length < 0.1
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = ((co[0] - x0) / (x1 - x0 + 1e-6), (co[2] - z0) / (z1 - z0 + 1e-6)) if front else (0.01, 0.01)
        if front: poly.material_index = 1

def finish(o, name, pos, rot, material, outline, bevel, parent=None, tile=None, shade_smooth=False):
    o.name = name; collection_link(o)
    o.location = P(*pos)
    if rot: o.rotation_euler = rot3(*rot)
    o.data.materials.clear(); o.data.materials.append(material)
    if tile: uv_box(o, tile)
    if shade_smooth:
        for p in o.data.polygons: p.use_smooth = True
    if bevel:
        m = o.modifiers.new('Bevel', 'BEVEL'); m.width = bevel; m.segments = 2; m.limit_method = 'ANGLE'
    if outline:
        o.data.materials.append(INK)
        s = o.modifiers.new('InkShell', 'SOLIDIFY'); s.thickness = outline; s.offset = 1.0
        s.use_flip_normals = True; s.material_offset = 1; s.use_rim = False
    if parent is not None: o.parent = parent
    ALL.append(o); return o

def box(name, size, pos, material, rot=None, outline=0.02, bevel=0.012, parent=None, tile=None):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = (size[0], size[2], size[1]); bpy.ops.object.transform_apply(scale=True)
    return finish(o, name, pos, rot, material, outline, bevel, parent, tile)

def cyl(name, r, h, pos, material, axis='y', rot=None, outline=0.015, bevel=0.0, verts=24, parent=None, tile=None, r2=None):
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=(r if r2 is None else r2), depth=h, vertices=verts)
    o = bpy.context.active_object
    # primitive axis is Blender Z (= three Y). tilt for x/z axis
    if axis == 'x': rot = (rot or (0, 0, 0)); rot = (rot[0], rot[1], rot[2] + math.pi / 2)
    if axis == 'z': rot = (rot or (0, 0, 0)); rot = (rot[0] + math.pi / 2, rot[1], rot[2])
    return finish(o, name, pos, rot, material, outline, bevel, parent, tile, shade_smooth=(verts >= 16))

def cone(name, r, h, pos, material, **kw): return cyl(name, r, h, pos, material, r2=0.0, **kw)

def sphere(name, r, pos, material, outline=0.015, parent=None, scale=(1, 1, 1), rot=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=20, ring_count=12)
    o = bpy.context.active_object
    o.scale = (scale[0], scale[2], scale[1]); bpy.ops.object.transform_apply(scale=True)
    return finish(o, name, pos, rot, material, outline, 0, parent, shade_smooth=True)

def torus(name, R, r, pos, material, rot=None, outline=0.01, parent=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=28, minor_segments=10)
    o = bpy.context.active_object
    return finish(o, name, pos, rot, material, outline, 0, parent, shade_smooth=True)

def prism(name, w, h, d, pos, material, rot=None, outline=0.03, parent=None, tile=0.5):
    """gable roof: triangle (w wide at base, h tall) extruded along z (depth d)"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    pts = [(-w / 2, 0), (w / 2, 0), (0, h)]
    v = [bm.verts.new((x, -d / 2, y)) for x, y in pts] + [bm.verts.new((x, d / 2, y)) for x, y in pts]
    # blender space: x, y(depth), z(up)
    bm.faces.new((v[0], v[2], v[1])); bm.faces.new((v[3], v[4], v[5]))
    bm.faces.new((v[0], v[1], v[4], v[3])); bm.faces.new((v[1], v[2], v[5], v[4])); bm.faces.new((v[2], v[0], v[3], v[5]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    return finish(o, name, pos, rot, material, outline, 0, parent, tile)

def empty(name, pos, rot=None, parent=None):
    e = bpy.data.objects.new(name, None); collection_link(e); e.location = P(*pos)
    if rot: e.rotation_euler = rot3(*rot)
    if parent is not None: e.parent = parent
    return e

def sign(name, tex, w, h, pos, ry=0.0, frame='#3a230c', thick=0.05, outline=0.015, emit=False, rot=None):
    """thin board whose front (three +Z) carries a canvas texture"""
    m_front = mat(name + '_tex', '#ffffff', tex, rough=0.5, emit=('tex' if emit else None), estr=0.9)
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.active_object
    o.scale = (w, thick, h); bpy.ops.object.transform_apply(scale=True)
    o.data.materials.clear(); o.data.materials.append(mat('frame_' + frame, frame, rough=0.5)); o.data.materials.append(m_front)
    uv_front(o)
    return finish_keepmats(o, name, pos, rot if rot else (0, ry, 0), outline)

def finish_keepmats(o, name, pos, rot, outline):
    o.name = name; collection_link(o); o.location = P(*pos); o.rotation_euler = rot3(*rot)
    if outline:
        o.data.materials.append(INK)
        s = o.modifiers.new('InkShell', 'SOLIDIFY'); s.thickness = outline; s.offset = 1.0
        s.use_flip_normals = True; s.material_offset = 2; s.use_rim = False
    ALL.append(o); return o

# ---------------------------------------------------------------- palette
CREAM, OCHRE, AMBER, WOOD, WOOD_D = '#f1e0bd', '#d89b3c', '#f2a93b', '#b9783a', '#6f4322'
TEAL, BLUE, PURPLE, ROSE, RED, GREEN = '#2f9aa8', '#2f5fb0', '#7a4aa8', '#e08a8a', '#c9482f', '#5da05a'
GOLD = '#f6c542'
M = lambda n, c, **k: mat(n, c, **k)

# ================================================================= LAB (Copenhagen institute, 1940)
R = LAYOUT['lab']['room']
def build_lab():
    L = {}
    floor = box('lab_floor', (10.4, 0.2, 8.4), (0, -0.1, 0), mat('floor', '#ffffff', 'planks_floor'), outline=0, bevel=0, tile=0.34)
    box('lab_ceiling', (10.4, 0.2, 8.4), (0, 3.7, 0), M('ceil', '#b98a4e'), outline=0, bevel=0)
    # walls (plaster) + brick wainscot
    wallm = {'back': mat('wall_back', '#ffffff', 'plaster_cream'), 'left': mat('wall_left', '#ffffff', 'brick_ochre'),
             'right': mat('wall_right', '#ffffff', 'plaster_cream'), 'front': mat('wall_front', '#ffffff', 'plaster_rose')}
    box('wall_back', (10.4, 3.6, 0.2), (0, 1.8, -4.1), wallm['back'], outline=0, bevel=0, tile=0.6)
    box('wall_front', (10.4, 3.6, 0.2), (0, 1.8, 4.1), wallm['front'], outline=0, bevel=0, tile=0.6)
    box('wall_left', (0.2, 3.6, 8.4), (-5.1, 1.8, 0), wallm['left'], outline=0, bevel=0, tile=0.8)
    box('wall_right', (0.2, 3.6, 8.4), (5.1, 1.8, 0), wallm['right'], outline=0, bevel=0, tile=0.6)
    brick = mat('wainscot', '#ffffff', 'brick_red')
    box('wain_back', (10, 1.15, 0.08), (0, 0.575, -3.96), brick, outline=0.012, bevel=0.01, tile=0.9)
    box('wain_right', (0.08, 1.15, 8), (4.96, 0.575, 0), brick, outline=0.012, bevel=0.01, tile=0.9)
    box('wain_front', (10, 1.15, 0.08), (0, 0.575, 3.96), brick, outline=0.012, bevel=0.01, tile=0.9)
    for x in (-4.99, 4.99): pass
    # skirting + rail
    for nm, sz, ps in [('rail_back', (10, 0.08, 0.1), (0, 1.17, -3.95)), ('rail_right', (0.1, 0.08, 8), (4.95, 1.17, 0)), ('rail_front', (10, 0.08, 0.1), (0, 1.17, 3.95))]:
        box(nm, sz, ps, M('rail', WOOD_D), outline=0.01, bevel=0.01)
    # ceiling beams
    for i, z in enumerate((-3, -1, 1, 3)): box(f'beam{i}', (10.2, 0.25, 0.28), (0, 3.45, z), M('beam', '#8a5a2e'), outline=0.02, bevel=0.02)
    # pipes along the ceiling
    for i, (z, c) in enumerate(((-3.7, '#3b7f8a'), (3.7, '#c9482f'))):
        cyl(f'pipe{i}', 0.08, 10, (0, 3.25, z), M('pipe', c, metal=0.3), axis='x', outline=0.012)

    # ---- window (cool dusk light) on the back wall
    sign('window_view', 'window_dusk', 2.2, 1.8, (-2.3, 2.0, -3.93), emit=True, frame='#f0e0c0', thick=0.04)
    sign('window_day', 'window_day', 2.2, 1.8, (-2.3, 2.0, -3.915), emit=True, frame='#f0e0c0', thick=0.02, outline=0)
    for nm, sz, ps in [('win_v', (0.08, 1.9, 0.1), (-2.3, 2.0, -3.9)), ('win_h', (2.3, 0.08, 0.1), (-2.3, 2.0, -3.9)),
                       ('win_top', (2.5, 0.12, 0.14), (-2.3, 2.98, -3.9)), ('win_bot', (2.5, 0.12, 0.14), (-2.3, 1.05, -3.9)),
                       ('win_l', (0.12, 2.0, 0.14), (-3.46, 2.02, -3.9)), ('win_r', (0.12, 2.0, 0.14), (-1.14, 2.02, -3.9))]:
        box(nm, sz, ps, M('winframe', '#fff0d0'), outline=0.012, bevel=0.01)
    box('sill', (2.7, 0.08, 0.35), (-2.3, 1.0, -3.8), M('sill', WOOD), outline=0.015)
    for i, x in enumerate((-3.85, -0.75)):  # curtains
        box(f'curtain{i}', (0.55, 2.2, 0.16), (x, 2.05, -3.84), M('curtain', PURPLE), outline=0.02, bevel=0.05)
    box('curtain_rod', (4.2, 0.06, 0.06), (-2.3, 3.2, -3.82), M('rod', GOLD, metal=0.4), outline=0.01)
    # radiator under the window
    box('radiator', (1.6, 0.6, 0.18), (-2.3, 0.5, -3.78), M('rad', '#e8dfc8'), outline=0.015, bevel=0.03)
    for i in range(8): box(f'rad{i}', (0.05, 0.5, 0.2), (-2.95 + i * 0.19, 0.5, -3.78), M('rad2', '#d6c9a8'), outline=0.006, bevel=0.01)

    # ---- chalkboard with the formula
    sign('chalkboard', 'chalkboard', 2.6, 1.62, (1.5, 1.95, -3.9), frame='#7a4a22', thick=0.06)
    box('chalk_tray', (2.4, 0.06, 0.14), (1.5, 1.1, -3.82), M('tray', WOOD_D), outline=0.01)
    for i in range(3): cyl(f'chalk{i}', 0.014, 0.1, (0.9 + i * 0.12, 1.16, -3.82), M('chalk', '#fffaf0'), axis='x', outline=0.004, verts=8)
    # ---- door (hinged, animated)  + plaque
    dx, dz = LAYOUT['lab']['door']['hinge'][0], LAYOUT['lab']['door']['hinge'][2]
    box('door_hole', (1.45, 2.45, 0.1), (3.9, 1.22, -3.98), M('dark', '#2b2140'), outline=0, bevel=0)
    box('door_frame_t', (1.6, 0.14, 0.2), (3.9, 2.45, -3.88), M('dframe', WOOD_D), outline=0.015)
    for i, x in enumerate((3.12, 4.68)): box(f'door_frame{i}', (0.14, 2.5, 0.2), (x, 1.22, -3.88), M('dframe', WOOD_D), outline=0.015)
    hinge = empty('door', (dx, 0, dz))
    box('door_leaf', (1.3, 2.3, 0.1), (0.65, 1.15, 0.0), mat('doorleaf', '#ffffff', 'planks_dark', rough=0.45), parent=hinge, outline=0.02, tile=0.7)
    sphere('door_knob', 0.06, (1.15, 1.1, 0.1), M('knob', GOLD, metal=0.5), parent=hinge)
    box('door_glass', (0.5, 0.7, 0.04), (0.65, 1.55, 0.06), M('dglass', '#9fd6e8', emit='#9fd6e8', estr=0.3), parent=hinge, outline=0.012)
    sign('plaque_lab', 'plaque_lab', 1.0, 0.25, (3.9, 2.75, -3.85), frame='#3a230c')
    # ---- clock, calendars, posters
    cyl('clock', 0.38, 0.06, (0.3, 3.0, -3.9), mat('clock', '#ffffff', 'clock'), axis='z', outline=0.02)
    # clock face texture: use sign on top
    sign('clock_face', 'clock', 0.72, 0.72, (0.3, 3.0, -3.86), frame='#fffaf0', thick=0.02, outline=0)
    cal = LAYOUT['lab']['calendar']
    sign('cal_1940', 'cal_1940', 0.5, 0.64, tuple(cal), frame='#f0e6c8')
    sign('cal_1945', 'cal_1945', 0.5, 0.64, (cal[0], cal[1], cal[2] + 0.02), frame='#f0e6c8')
    sign('poster_el', 'poster_elements', 0.9, 1.12, (-4.95, 2.1, -2.3), ry=math.pi / 2, frame='#3a230c')
    sign('poster_safe', 'poster_safety', 0.9, 1.12, (-4.95, 2.1, 2.3), ry=math.pi / 2, frame='#3a230c')
    sign('poster_el2', 'poster_elements', 0.7, 0.88, (0, 2.1, 3.94), ry=math.pi, frame='#3a230c')

    # ---- bench (George works behind it)
    b = LAYOUT['lab']['bench']; bx = (b['x0'] + b['x1']) / 2; bz = (b['z0'] + b['z1']) / 2; bw = b['x1'] - b['x0']; bd = b['z1'] - b['z0']
    box('bench_top', (bw + 0.1, 0.09, bd + 0.1), (bx, b['top'] - 0.045, bz), mat('benchtop', '#ffffff', 'planks_dark', rough=0.3), outline=0.025, tile=0.7)
    box('bench_body', (bw, 0.9, bd - 0.1), (bx, 0.45, bz), mat('benchbody', '#ffffff', 'planks_light'), outline=0.025, tile=0.6)
    for i in range(5):
        x = bx - bw / 2 + 0.45 + i * (bw - 0.9) / 4
        box(f'drawer{i}', (0.7, 0.34, 0.04), (x, 0.62, b['z1'] - 0.03), M('drawer', '#5d4a8f'), outline=0.012)
        sphere(f'dknob{i}', 0.04, (x, 0.62, b['z1'] + 0.02), M('knob', GOLD, metal=0.4), outline=0.008)
    # hero jar group (animated)  — glass jar with orange liquid, label HAuCl4
    jar = empty('hero_jar', LAYOUT['lab']['beaker'])
    cyl('hero_glass', 0.19, 0.5, (0, 0.25, 0), M('glassA', '#e8f6fa', rough=0.1, alpha=0.28), parent=jar, outline=0.02, verts=28)
    cyl('hero_liquid', 0.165, 0.36, (0, 0.2, 0), M('orange', '#ff8a1f', emit='#ff6a00', estr=0.25, rough=0.2), parent=jar, outline=0.0, verts=28)
    cyl('hero_lid', 0.2, 0.05, (0, 0.52, 0), M('lid', '#7a4aa8'), parent=jar, outline=0.015, verts=28)
    sign('hero_label', 'label_gold', 0.2, 0.2, (0, 0.27, 0.205), frame='#fff1b8', thick=0.01, outline=0)
    hero_label = bpy.data.objects['hero_label']; hero_label.parent = jar; hero_label.location = P(0, 0.27, 0.2)
    # gold medals on a velvet tray with a plaque
    tx, ty, tz = LAYOUT['lab']['tray']
    box('tray', (1.0, 0.06, 0.55), (tx, ty + 0.03, tz), mat('velvet', '#ffffff', 'velvet'), outline=0.02, bevel=0.025)
    sign('plaque_nobel', 'plaque_nobel', 0.6, 0.2, (tx, ty + 0.12, tz + 0.3), rot=(-0.25, 0, 0), frame='#3a230c')
    for nm, dx in (('medalL', -0.2), ('medalR', 0.2)):
        g = empty(nm, (tx + dx, ty + 0.27, tz - 0.02))
        cyl(nm + '_disc', 0.17, 0.035, (0, 0, 0), M('gold', GOLD, metal=0.45, rough=0.25, emit='#c98a14', estr=0.35), parent=g, rot=(math.pi / 2, 0, 0), outline=0.012, verts=32, bevel=0.0)
        cyl(nm + '_inner', 0.12, 0.04, (0, 0, 0.003), M('gold2', '#e0a21a', metal=0.4, rough=0.3), parent=g, rot=(math.pi / 2, 0, 0), outline=0.006, verts=32)
        box(nm + '_ribbon', (0.07, 0.2, 0.012), (0, 0.27, -0.01), M('ribbon', RED), parent=g, outline=0.008)
        cyl(nm + '_stand', 0.02, 0.18, (0, -0.1, -0.05), M('stand', WOOD_D), parent=g, outline=0.006, verts=8)
    # acid bottle
    ax, ay, az = LAYOUT['lab']['acid']
    cyl('acid_body', 0.14, 0.36, (ax, ay + 0.18, az), M('acid', '#6bd06b', emit='#2f9a2f', estr=0.15), outline=0.018, verts=24)
    cone('acid_shoulder', 0.14, 0.1, (ax, ay + 0.41, az), M('acid', '#6bd06b'), r2=0.0, outline=0.0) if False else None
    cyl('acid_neck', 0.06, 0.16, (ax, ay + 0.44, az), M('acid_g', '#cfe9ee', rough=0.15), outline=0.012)
    cyl('acid_cork', 0.07, 0.06, (ax, ay + 0.54, az), M('cork', '#c08a52'), outline=0.01)
    sign('acid_label', 'label_acid', 0.2, 0.2, (ax, ay + 0.2, az + 0.145), frame='#ffd7c7', thick=0.01, outline=0)
    # flasks, test tubes, burner, books, microscope, mortar, funnel
    for i, (fx, col) in enumerate(((1.0, '#e86a9a'), (0.8, '#7ad0e8'))):
        sphere(f'flask{i}', 0.13, (fx + i * 0.26, ty + 0.13, bz - 0.25), M('flask', col, emit=col, estr=0.1))
        cyl(f'flaskneck{i}', 0.04, 0.16, (fx + i * 0.26, ty + 0.3, bz - 0.25), M('flaskn', '#cfe9ee', rough=0.1), outline=0.01)
    box('rack', (0.5, 0.05, 0.14), (-2.6, ty + 0.03, -1.7), M('rack', WOOD), outline=0.01)
    for i in range(6):
        cyl(f'tube{i}', 0.03, 0.26, (-2.8 + i * 0.09, ty + 0.18, -1.7), M('tube', ['#e05a5a', '#e0c85a', '#5ae0b0', '#5a8ae0', '#c05ae0', '#e08a3a'][i], emit=['#e05a5a', '#e0c85a', '#5ae0b0', '#5a8ae0', '#c05ae0', '#e08a3a'][i], estr=0.1), outline=0.008, verts=12)
    cyl('burner', 0.07, 0.2, (-1.0, ty + 0.1, -1.9), M('burner', '#6a6f78', metal=0.4), outline=0.012)
    cone('flame', 0.045, 0.14, (-1.0, ty + 0.29, -1.9), M('flame', '#5ab0ff', emit='#3a90ff', estr=1.4), outline=0.0, verts=10)
    for i, c in enumerate((RED, BLUE, GREEN, OCHRE)): box(f'book{i}', (0.42, 0.07, 0.3), (1.15, ty + 0.035 + i * 0.075, -1.55 - 0.03 * (i % 2)), M('book', c), outline=0.012, rot=(0, 0.1 * (i % 3), 0))
    cyl('mic_base', 0.1, 0.04, (0.95, ty + 0.02, -1.75), M('mic', '#2a2a30'), outline=0.01); cyl('mic_arm', 0.025, 0.36, (0.95, ty + 0.2, -1.75), M('mic2', '#c9b38a', metal=0.5), outline=0.008)
    cyl('mic_tube', 0.035, 0.18, (0.98, ty + 0.4, -1.72), M('mic3', '#2a2a30'), rot=(0.7, 0, 0), outline=0.008)
    # desk lamp (warm practical)
    cyl('lamp_base', 0.1, 0.03, (-2.55, ty + 0.015, -1.45), M('lampb', '#3a3a48'), outline=0.01)
    cyl('lamp_arm', 0.015, 0.45, (-2.55, ty + 0.25, -1.45), M('lampa', '#3a3a48'), outline=0.006, verts=8)
    cone('lamp_shade', 0.15, 0.16, (-2.55, ty + 0.55, -1.45), M('lamps', '#e86a3a', emit='#ff8a3a', estr=0.25), outline=0.012, r2=0.05) if False else cyl('lamp_shade', 0.15, 0.16, (-2.55, ty + 0.55, -1.45), M('lamps', '#e86a3a', emit='#ff8a3a', estr=0.25), outline=0.012, r2=0.05)
    sphere('lamp_bulb', 0.05, (-2.55, ty + 0.48, -1.45), M('bulb', '#fff0b8', emit='#ffd980', estr=3), outline=0)
    # stools
    for i, (sx, sz) in enumerate(((-4.1, -2.7), (4.1, 3.0))):
        cyl(f'stool_top{i}', 0.25, 0.06, (sx, 0.62, sz), M('stool', OCHRE), outline=0.015)
        for k in range(3): cyl(f'stool_leg{i}{k}', 0.02, 0.6, (sx + math.cos(k * 2.1) * 0.17, 0.3, sz + math.sin(k * 2.1) * 0.17), M('legs', WOOD_D), outline=0.006, verts=8)

    # ---- the shelf wall (right): a hundred lookalike jars
    s = LAYOUT['lab']['shelf']; sx = s['x']; z0, z1 = s['z0'], s['z1']; zc = (z0 + z1) / 2; zl = z1 - z0
    box('shelf_back', (0.06, 3.2, zl), (sx + 0.38, 1.65, zc), M('shelfback', '#8a5a2e'), outline=0.015)
    for i, y in enumerate(s['tierY']):
        box(f'shelf_board{i}', (0.55, 0.07, zl), (sx + 0.1, y - 0.035, zc), mat('board', '#ffffff', 'planks_light'), outline=0.02, tile=0.6)
    for i, z in enumerate((z0 - 0.02, -2.5, 2.0, z1 + 0.02)): box(f'shelf_post{i}', (0.58, 3.2, 0.09), (sx + 0.1, 1.6, z), M('post', WOOD_D), outline=0.02)
    liquids = ['#4fc3b8', '#a86be0', '#f2a93b', '#6fc46f', '#e86a8a', '#6a9ae8', '#e8d36a', '#c9d3d6']
    n = 0
    for ti, y in enumerate(s['tierY']):
        z = z0 + 0.2
        while z < z1 - 0.2:
            r = random.uniform(0.075, 0.115); h = random.uniform(0.2, 0.42)
            if ti == 1 and abs(z - s['hero'][2]) < 0.3: z += 0.3; continue
            col = random.choice(liquids)
            kind = random.random()
            if kind < 0.6:
                cyl(f'jar{n}', r, h, (sx + 0.1 + random.uniform(-0.03, 0.03), y + h / 2, z), M('jar', col, emit=col, estr=0.08, rough=0.18), outline=0.012, verts=14)
                cyl(f'jarlid{n}', r * 1.05, 0.04, (sx + 0.1, y + h + 0.02, z), M('jarlid', random.choice(['#5a3a8a', '#8a5a2e', '#c9482f', '#2f5fb0'])), outline=0.008, verts=14)
                if random.random() < 0.7:
                    lb = sign(f'jarlabel{n}', f'label_{random.randrange(10)}', r * 1.3, r * 1.3, (sx + 0.1 - r - 0.004, y + h * 0.5, z), ry=-math.pi / 2, frame='#f6edd2', thick=0.006, outline=0)
            elif kind < 0.82:
                sphere(f'flk{n}', r * 1.1, (sx + 0.1, y + r * 1.1, z), M('flk', col, emit=col, estr=0.08, rough=0.18))
                cyl(f'flkneck{n}', r * 0.4, 0.14, (sx + 0.1, y + r * 2.1 + 0.03, z), M('flkn', '#cfe9ee', rough=0.12), outline=0.008, verts=10)
            else:
                box(f'bk{n}', (0.22, h + 0.05, 0.12), (sx + 0.1, y + (h + 0.05) / 2, z), M('bk', random.choice([RED, BLUE, GREEN, OCHRE, PURPLE])), outline=0.01)
            n += 1; z += random.uniform(0.25, 0.34)
    # ---- junk-drawer cabinet (left wall) with an open drawer full of junk
    jx, jy, jz = LAYOUT['lab']['junk']['cabinet']
    box('cab_body', (0.62, 0.9, 2.1), (jx, jy, jz), mat('cab', '#ffffff', 'planks_light'), outline=0.025, tile=0.6)
    box('cab_top', (0.7, 0.07, 2.2), (jx, 0.935, jz), M('cabtop', WOOD_D), outline=0.02)
    for i, z in enumerate((jz - 0.7, jz + 0.7)):
        box(f'cab_door{i}', (0.04, 0.7, 0.62), (jx + 0.32, 0.38, z), M('cabdoor', OCHRE), outline=0.012)
        sphere(f'cab_knob{i}', 0.035, (jx + 0.36, 0.45, z + (0.2 if i == 0 else -0.2)), M('knob', GOLD, metal=0.4), outline=0.008)
    dr = LAYOUT['lab']['junk']['drawer']
    box('drawer_front', (0.05, 0.22, 1.2), (dr[0] + 0.28, dr[1] - 0.02, dr[2]), M('drawerfront', WOOD), outline=0.015)
    sign('junk_sign', 'sign_junk', 0.5, 0.15, (dr[0] + 0.32, dr[1] - 0.02, dr[2]), ry=math.pi / 2, frame='#6f4322', thick=0.02)
    box('drawer_floor', (0.58, 0.04, 1.14), (dr[0], dr[1] - 0.1, dr[2]), M('drawerfloor', '#8a5a2e'), outline=0.01)
    for sgn, nm in ((-1, 'a'), (1, 'b')): box('drawer_side' + nm, (0.58, 0.18, 0.04), (dr[0], dr[1], dr[2] + sgn * 0.58), M('drawerside', WOOD), outline=0.01)
    box('drawer_back', (0.04, 0.18, 1.14), (dr[0] - 0.29, dr[1], dr[2]), M('drawerside', WOOD), outline=0.01)
    junk_cols = ['#e05a5a', '#e0c85a', '#5ae0b0', '#5a8ae0', '#c05ae0', '#e08a3a', '#cfd6d9']
    for i in range(22):  # tape rolls, rubber bands, string balls
        x = dr[0] + random.uniform(-0.22, 0.22); z = dr[2] + random.uniform(-0.5, 0.5); c = random.choice(junk_cols)
        torus(f'junk_ring{i}', 0.055 + random.random() * 0.03, 0.02, (x, dr[1] + random.uniform(-0.02, 0.07), z), M('junk', c), rot=(random.random() * 0.6, random.random() * 3, 0), outline=0.006)
    for i in range(9):
        x = dr[0] + random.uniform(-0.22, 0.22); z = dr[2] + random.uniform(-0.5, 0.5)
        cyl(f'junk_bat{i}', 0.02, 0.1, (x, dr[1] + random.uniform(0.0, 0.09), z), M('bat', random.choice(['#e0c85a', '#5a8ae0', '#c9482f'])), axis='z', rot=(0, random.random() * 3, 0), outline=0.005, verts=10)
    for i in range(5):
        sphere(f'junk_ball{i}', 0.065, (dr[0] + random.uniform(-0.2, 0.2), dr[1] + 0.06, dr[2] + random.uniform(-0.5, 0.5)), M('ball', random.choice(junk_cols)), outline=0.006)
    for i in range(6):
        cyl(f'junk_pencil{i}', 0.012, 0.22, (dr[0] + random.uniform(-0.15, 0.15), dr[1] + random.uniform(0.0, 0.1), dr[2] + random.uniform(-0.5, 0.5)), M('pencil', random.choice(['#e8c23a', '#e05a5a'])), axis='z', rot=(0, random.random() * 3, 0), outline=0.004, verts=6)
    for i in range(5):
        box(f'junk_key{i}', (0.06, 0.012, 0.03), (dr[0] + random.uniform(-0.2, 0.2), dr[1] + 0.03, dr[2] + random.uniform(-0.5, 0.5)), M('key', '#c9b38a', metal=0.5), rot=(0, random.random() * 3, 0), outline=0.004, bevel=0.004)
        torus(f'junk_keyring{i}', 0.02, 0.005, (dr[0] + random.uniform(-0.2, 0.2), dr[1] + 0.03, dr[2] + random.uniform(-0.5, 0.5)), M('key', '#c9b38a', metal=0.5), outline=0.003)
    # pegboard with tools above the cabinet
    box('pegboard', (0.05, 1.0, 2.0), (-5.0, 1.8, jz), M('peg', '#c9a36a'), outline=0.015)
    for i in range(5):
        cyl(f'tool{i}', 0.02, 0.5, (-4.95, 1.8, jz - 0.8 + i * 0.4), M('tool', '#6a6f78', metal=0.4), outline=0.006, verts=8, rot=(0, 0, 0.0))
        box(f'toolh{i}', (0.05, 0.14, 0.07), (-4.95, 1.52, jz - 0.8 + i * 0.4), M('toolh', random.choice([RED, BLUE, OCHRE])), outline=0.008)
    # round search-table + crates (front-right)
    tx, tz = LAYOUT['lab']['table'][0], LAYOUT['lab']['table'][2]
    cyl('table_top', 0.7, 0.07, (tx, 0.82, tz), mat('tablecloth', '#ffffff', 'stripes'), outline=0.02, verts=32, tile=0.8)
    cyl('table_leg', 0.07, 0.8, (tx, 0.4, tz), M('tleg', WOOD_D), outline=0.015)
    cyl('table_foot', 0.38, 0.05, (tx, 0.025, tz), M('tfoot', WOOD_D), outline=0.012)
    for i, (cx, cz, s2) in enumerate(((tx + 0.85, tz + 0.55, 0.5), (tx + 0.85, tz + 0.55, 0.4), (tx - 0.6, tz - 1.6, 0.55))):
        box(f'crate{i}', (s2, s2, s2), (cx, s2 / 2 + (0.5 if i == 1 else 0), cz), mat('crate', '#ffffff', 'planks_light'), outline=0.02, tile=0.9, rot=(0, 0.2 * i, 0))
    # globe, ladder, coat rack, filing cabinet, rug
    box('rug', (4.2, 0.03, 3.0), (0.4, 0.015, 0.9), mat('rug', '#ffffff', 'rug'), outline=0.012, bevel=0.008)
    cyl('globe_stand', 0.04, 0.5, (-4.2, 0.25, 2.6), M('gstand', WOOD_D), outline=0.01); sphere('globe', 0.3, (-4.2, 0.85, 2.6), M('globe', '#3a86c9', emit='#2a6aa9', estr=0.1))
    torus('globe_ring', 0.34, 0.015, (-4.2, 0.85, 2.6), M('gring', GOLD, metal=0.4), rot=(1.2, 0, 0.3), outline=0.006)
    for i, x in enumerate((-0.2, 0.2)): box(f'ladder{i}', (0.06, 2.6, 0.05), (4.4 + x * 0.3 - 0.4 + i * 0.3, 1.3, 2.4), M('ladder', WOOD), outline=0.012, rot=(0, 0, 0.0))
    for i in range(7): box(f'rung{i}', (0.5, 0.04, 0.04), (4.4 - 0.25 + 0.15, 0.3 + i * 0.35, 2.4), M('rung', WOOD), outline=0.008)
    box('filing', (0.9, 1.3, 0.6), (-4.2, 0.65, -3.5), M('filing', '#6a7f9a'), outline=0.02)
    for i in range(3): box(f'filing_d{i}', (0.8, 0.34, 0.03), (-4.2, 0.25 + i * 0.4, -3.18), M('filingd', '#5a6f8a'), outline=0.01)
    # hanging pendant lamps
    for i, (px, pz) in enumerate(((-1.5, -0.5), (2.0, -0.8), (0.3, 1.5))):
        cyl(f'pend_wire{i}', 0.01, 0.5, (px, 3.3, pz), M('wire', '#2a1a2e'), outline=0, verts=6)
        cyl(f'pend_shade{i}', 0.34, 0.28, (px, 2.95, pz), M('pend', '#e8a43a'), outline=0.018, verts=24, r2=0.08)
        sphere(f'pend_bulb{i}', 0.09, (px, 2.84, pz), M('bulb', '#fff0b8', emit='#ffd980', estr=4), outline=0)
    # front wall: arched window + coat rack
    sign('front_window', 'window_day', 2.0, 1.7, (-2.5, 2.0, 3.93), ry=math.pi, emit=True, frame='#f0e0c0')
    for i, x in enumerate((-0.5, 0.0, 0.5)): sphere(f'hook{i}', 0.04, (3.5 + x, 1.9, 3.9), M('hook', GOLD, metal=0.4), outline=0.006)
    box('coat_rack', (1.8, 0.1, 0.1), (3.5, 1.9, 3.94), M('rack2', WOOD_D), outline=0.012)
    for i in range(3): box(f'coat{i}', (0.4, 1.0, 0.1), (3.0 + i * 0.5, 1.4, 3.86), M('coat', [BLUE, RED, GREEN][i]), outline=0.015, bevel=0.03)
    return L

# ================================================================= STREET (Copenhagen, 9 April 1940)
def build_street():
    ox = LAYOUT['street']['origin'][0]
    cob = mat('cobble', '#ffffff', 'cobble')
    box('road', (8, 0.2, 80), (ox, -0.1, -10), cob, outline=0, bevel=0, tile=0.4)
    walk = M('walk', '#d6c7a8')
    for s in (-1, 1): box(f'walk{s}', (3.2, 0.3, 80), (ox + s * 5.6, -0.05, -10), walk, outline=0.02, bevel=0.02)
    cols = ['plaster_ochre', 'plaster_rose', 'plaster_sky', 'plaster_cream']
    roofc = ['#8a3a2e', '#6a4a8a', '#3a6a7a', '#a8553a']
    signs = ['sign_bakery', 'sign_books', 'sign_cafe']
    k = 0
    for side in (-1, 1):
        for i, z in enumerate((14, 8, 2, -4, -10)):
            bx = ox + side * 10.2; w = 5.6; hgt = 6.2 + (i % 3) * 0.8
            tex = cols[(i + (1 if side > 0 else 0)) % 4]
            box(f'bld{side}_{i}', (6.2, hgt, w), (bx, hgt / 2, z), mat('bld', '#ffffff', tex), outline=0.03, bevel=0.03, tile=0.55)
            prism(f'roof{side}_{i}', w + 0.6, 1.9, 6.6, (bx, hgt, z), M('roof', roofc[(i + k) % 4]), rot=(0, math.pi / 2, 0))
            fx = bx - side * 3.1  # facade toward the road
            for row in range(2):
                for col in (-1.7, 0, 1.7):
                    wy = 3.0 + row * 2.0
                    box(f'win{side}_{i}_{row}_{col}', (0.1, 1.0, 0.8), (fx - side * 0.05, wy, z + col), M('win', '#ffe5a0', emit='#ffd070', estr=0.55), outline=0.015)
                    box(f'winf{side}_{i}_{row}_{col}', (0.14, 1.15, 0.95), (fx - side * 0.04, wy, z + col), M('winf', '#fffaf0'), outline=0.012)
                    box(f'wsill{side}_{i}_{row}_{col}', (0.25, 0.08, 1.0), (fx - side * 0.12, wy - 0.58, z + col), M('wsill', WOOD_D), outline=0.01)
                    if row == 1: box(f'flow{side}_{i}_{col}', (0.25, 0.18, 0.9), (fx - side * 0.2, wy - 0.7, z + col), M('flowerbox', RED), outline=0.01)
            box(f'door{side}_{i}', (0.12, 2.0, 1.0), (fx - side * 0.06, 1.0, z + 0.2), mat('doorb', '#ffffff', 'planks_dark'), outline=0.015, tile=0.7)
            if i % 2 == 0:
                sign(f'shop{side}_{i}', signs[(i // 2 + (1 if side > 0 else 0)) % 3], 2.2, 0.55, (fx - side * 0.2, 2.75, z + 0.2), ry=(-math.pi / 2 if side > 0 else math.pi / 2), frame='#3a230c', thick=0.06)
            k += 1
    # the Institute at the end of the street
    ix, _, iz = LAYOUT['street']['institute']
    box('inst_body', (12, 9, 5), (ix, 4.5, iz - 2.5), mat('inst', '#ffffff', 'brick_red'), outline=0.04, bevel=0.04, tile=0.5)
    box('inst_band', (12.4, 0.5, 5.2), (ix, 6.6, iz - 2.5), M('instband', '#f1e0bd'), outline=0.03)
    prism('inst_roof', 5.6, 2.2, 12.6, (ix, 9, iz - 2.5), M('instroof', '#5a3a6a'), rot=(0, math.pi / 2, 0))
    for i in range(4): box(f'inst_col{i}', (0.5, 4.2, 0.5), (ix - 2.4 + i * 1.6, 2.1, iz + 0.4), M('col', '#f6e8c8'), outline=0.025, bevel=0.03)
    box('inst_porch', (5.8, 0.4, 1.6), (ix, 4.3, iz + 0.2), M('porch', '#f6e8c8'), outline=0.03)
    for i in range(4): box(f'inst_step{i}', (6.0 + i * 0.3, 0.2, 0.5), (ix, 0.1 + i * 0.2 - 0.1, iz + 1.2 + (3 - i) * 0.5 - 0.6 + 0.0), M('step', '#c9b38a'), outline=0.02)
    box('inst_door', (1.8, 2.8, 0.14), (ix, 1.4, iz - 0.05), mat('instdoor', '#ffffff', 'planks_dark'), outline=0.025, tile=0.7)
    sign('inst_plaque', 'plaque_institute', 5.2, 1.95, (ix, 5.7, iz + 1.05), frame='#3a230c', thick=0.12)
    for i, x in enumerate((-4.2, -2.6, 2.6, 4.2)):
        for row in range(2):
            box(f'inst_win{i}{row}', (1.0, 1.4, 0.12), (ix + x, 2.2 + row * 3.4 if row == 0 else 7.6, iz - 0.04), M('win', '#ffe5a0', emit='#ffd070', estr=0.5), outline=0.02)
    sign('inst_flag', 'banner_open', 3.0, 0.75, (ix, 3.3, iz + 1.1), frame='#3a230c', thick=0.05)
    # street furniture
    for side in (-1, 1):
        for i, z in enumerate((12, 7.5, -1, -8)):
            lx = ox + side * 3.9
            cyl(f'lamp_pole{side}{i}', 0.07, 4.2, (lx, 2.1, z), M('lamppole', '#3a3a48'), outline=0.012, verts=10)
            sphere(f'lamp_head{side}{i}', 0.28, (lx, 4.3, z), M('lamphead', '#fff0b8', emit='#ffe08a', estr=1.2))
            cone(f'lamp_cap{side}{i}', 0.34, 0.2, (lx, 4.62, z), M('lampcap', '#3a3a48'), outline=0.012, verts=12)
        for i, z in enumerate((9, -1)):  # trees
            tx_ = ox + side * 4.6
            cyl(f'trunk{side}{i}', 0.18, 2.2, (tx_, 1.1, z), M('trunk', '#7a4a24'), outline=0.015, verts=12)
            sphere(f'crown{side}{i}a', 1.1, (tx_, 3.0, z), M('crown', GREEN, emit='#3a7a3a', estr=0.1), outline=0.03)
            sphere(f'crown{side}{i}b', 0.8, (tx_ + 0.5, 3.8, z + 0.3), M('crown2', '#7cc06a', emit='#4a8a4a', estr=0.1), outline=0.03)
    # street sign on a post
    sx_, _, sz_ = LAYOUT['street']['signpost']
    cyl('signpost', 0.06, 3.2, (sx_, 1.6, sz_), M('sp', '#3a3a48'), outline=0.01, verts=10)
    sign('street_sign', 'sign_street', 1.9, 0.95, (sx_ + 0.04, 3.1, sz_ + 0.12), ry=0.55, frame='#e8e0c8', thick=0.06)
    # bicycle, truck, barrels
    bx_, bz_ = ox - 3.2, 9.5
    torus('bike_w1', 0.34, 0.03, (bx_, 0.37, bz_ - 0.5), M('bike', '#2a2a30'), rot=(0, math.pi / 2, 0)); torus('bike_w2', 0.34, 0.03, (bx_, 0.37, bz_ + 0.5), M('bike', '#2a2a30'), rot=(0, math.pi / 2, 0))
    cyl('bike_frame', 0.02, 1.1, (bx_, 0.7, bz_), M('bikef', RED), axis='z', outline=0.006, verts=8, rot=(0.25, 0, 0))
    box('bike_seat', (0.12, 0.05, 0.25), (bx_, 0.98, bz_ - 0.35), M('seat', '#2a2a30'), outline=0.008)
    tx2, tz2 = ox + 3.1, -2.0
    box('truck_body', (2.4, 2.3, 4.6), (tx2, 1.75, tz2), mat('tarp', '#ffffff', 'tarp'), outline=0.03, bevel=0.06, tile=0.8)
    box('truck_cab', (2.4, 1.7, 1.6), (tx2, 1.25, tz2 + 3.1), M('cab', '#59685a'), outline=0.03, bevel=0.05)
    box('truck_win', (2.0, 0.7, 0.05), (tx2, 1.6, tz2 + 3.92), M('twin', '#9fd6e8', emit='#9fd6e8', estr=0.3), outline=0.015)
    box('truck_chassis', (2.2, 0.35, 6.4), (tx2, 0.55, tz2 + 0.9), M('chassis', '#3a3a40'), outline=0.02)
    for i, (wx, wz) in enumerate(((-1.1, 3.0), (1.1, 3.0), (-1.1, -0.6), (1.1, -0.6), (-1.1, -1.6), (1.1, -1.6))):
        cyl(f'truck_w{i}', 0.5, 0.36, (tx2 + wx, 0.5, tz2 + wz), M('wheel', '#2a2a30'), axis='x', outline=0.02, verts=20)
    for i in range(3): cyl(f'barrel{i}', 0.3, 0.8, (ox - 3.3 + i * 0.7, 0.4, -7), M('barrel', ['#d6a24a', '#6a8ab0', '#a85a3a'][i]), outline=0.015)
    # sky dome + clouds + sun disc
    sdome = mat('skydome', '#ffffff', 'sky_day', rough=1.0, emit='tex', estr=1.0)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=170, segments=32, ring_count=16); sk = bpy.context.active_object
    sk.name = 'sky_dome'; collection_link(sk); sk.location = P(ox, -20, -10); sk.scale = (1, 1, 1)
    sk.data.materials.append(sdome)
    bm = bmesh.new(); bm.from_mesh(sk.data); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(sk.data); bm.free()
    for i, (cx, cy, cz, sz_) in enumerate(((ox - 30, 38, -90, 40), (ox + 26, 46, -100, 50), (ox - 6, 30, -70, 28), (ox + 50, 35, -40, 34), (ox - 56, 28, -30, 30), (ox + 4, 50, 40, 40))):
        pass
    for i, (cx, cy, cz, w) in enumerate(((ox - 24, 36, -80, 40), (ox + 22, 44, -90, 50), (ox - 4, 28, -60, 26), (ox + 40, 34, -50, 32))):
        sign(f'cloud{i}', 'cloud', w, w / 2, (cx, cy, cz), frame='#ffffff', thick=0.01, outline=0)
        o = bpy.data.objects[f'cloud{i}']; o.data.materials[0] = mat('cloudm', '#ffffff', 'cloud', rough=1.0, emit='tex', estr=1.0, alpha=1.0)
        o.data.materials[1] = o.data.materials[0]

# ================================================================= LIGHTS (practical + sky), tagged by set
def light(name, kind, pos, color, power, setname, size=1.0, spot=None, shadow=False, dist=0, decay=2, target=None):
    d = bpy.data.lights.new(name, kind); d.color = hexc(color)[:3]; d.energy = power
    if kind == 'SUN': d.angle = 0.05
    if kind == 'SPOT': d.spot_size = spot or 1.2
    o = bpy.data.objects.new(name, d); collection_link(o); o.location = P(*pos)
    if target:
        direction = (P(*target) - P(*pos)).normalized(); o.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    o['set'] = setname; o['intensity'] = power; o['shadow'] = int(shadow); o['dist'] = dist; o['decay'] = decay; o['kind'] = kind; o['color'] = color
    return o

def build_lights():
    # lab: warm practicals + cool window fill
    light('lab_pend0', 'POINT', (-1.5, 2.75, -0.5), '#ffd9a0', 0.8, 'lab', shadow=True, dist=9)
    light('lab_pend1', 'POINT', (2.0, 2.75, -0.8), '#ffd9a0', 0.7, 'lab', dist=9)
    light('lab_pend2', 'POINT', (0.3, 2.75, 1.5), '#ffd9a0', 0.55, 'lab', dist=9)
    light('lab_desk', 'POINT', (-2.55, 1.5, -1.45), '#ffb870', 0.45, 'lab', dist=5)
    light('lab_window', 'POINT', (-2.3, 2.0, -3.3), '#86aaff', 1.0, 'lab', dist=12, shadow=False)
    light('lab_window_front', 'POINT', (-2.5, 2.0, 3.4), '#9fc0ff', 0.55, 'lab', dist=10)
    light('lab_shelf', 'POINT', (3.0, 2.2, 0.0), '#ffd9a0', 0.45, 'lab', dist=8)
    light('lab_key', 'POINT', (0.0, 1.6, 3.2), '#fff0d8', 0.5, 'lab', dist=14)
    # street: strong warm sun + blue sky
    light('street_sun', 'SUN', (ox_s() + 26, 40, 30), '#ffe2b0', 2.6, 'street', shadow=True)
    o = bpy.data.objects['street_sun']; o.rotation_euler = (P(ox_s(), 0, -6) - P(ox_s() + 26, 40, 30)).normalized().to_track_quat('-Z', 'Y').to_euler()
def ox_s(): return LAYOUT['street']['origin'][0]

# ================================================================= build + export
build_lab(); build_street(); build_lights()
scene.world = bpy.data.worlds.new('World'); scene.world.color = (0.5, 0.6, 0.8)
scene.view_settings.view_transform = 'Standard'; scene.view_settings.exposure = -0.3
scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, 'RENDER_PT_eevee_next') or True else 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y, scene.render.fps = 1080, 1920, 30
scene['ambient'] = json.dumps(LAYOUT['ambient'])
out = os.path.join(DATA, 'scene.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_extras=True, export_cameras=False,
                          export_lights=True, export_yup=True, export_texcoords=True, export_normals=True, export_materials='EXPORT',
                          export_image_format='AUTO', use_selection=False, export_animations=False, export_draco_mesh_compression_enable=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DATA, 'scene.blend'))
print('EXPORTED', out, os.path.getsize(out) // 1024, 'KB objects', len(ALL))
