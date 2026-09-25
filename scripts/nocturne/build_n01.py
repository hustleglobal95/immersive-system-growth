"""Reproducible N01 blockout for Nocturne Objects.

Builds the canonical named hierarchy from clients/nocturne/n01-spec.json with
headless Blender (the `bpy` module), validates geometry, pivots and the Scene 05
anatomy pose, exports production GLBs and optionally renders proportion views.

Usage:
  python scripts/nocturne/build_n01.py                  # build, validate, export
  python scripts/nocturne/build_n01.py --render         # also render review views
"""

import argparse
import hashlib
import json
import math
import os
import sys

import bpy  # must precede bmesh/mathutils when running as a module
import bmesh
from mathutils import Matrix, Vector, noise
from mathutils.bvhtree import BVHTree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SPEC_PATH = os.path.join(ROOT, "clients", "nocturne", "n01-spec.json")
SPEC = json.load(open(SPEC_PATH))
PLAN = SPEC["plan"]
A, B = PLAN["halfWidth"], PLAN["halfDepth"]
TAU = math.tau


# ---------------------------------------------------------------- plan curve

def plan(t, s):
    """Asymmetric superellipse plan point at angle t, uniform scale s."""
    n = PLAN["superellipse"]
    c, si = math.cos(t), math.sin(t)
    ce = math.copysign(abs(c) ** (2 / n), c)
    se = math.copysign(abs(si) ** (2 / n), si)
    x = A * ce + 0.5 * PLAN["endExtension"] * c * c
    y = (B + PLAN["depthSkew"] * si) * se * (1 - PLAN["eggTaper"] * c)
    y += PLAN["centerlineBow"] * max(0.0, 1 - (x / A) ** 2)
    return x * s, y * s


def plan_normal(t):
    """Approximate outward plan direction at angle t."""
    x0, y0 = plan(t - 1e-3, 1)
    x1, y1 = plan(t + 1e-3, 1)
    d = Vector((y1 - y0, -(x1 - x0), 0))
    return d.normalized()


def dome(u, p):
    """Superellipse quarter: u=0 edge, u=1 pole. Returns (s, zfrac)."""
    phi = u * math.pi / 2
    return abs(math.cos(phi)) ** (2 / p), abs(math.sin(phi)) ** (2 / p)


# ---------------------------------------------------------------- mesh builders

def loft(profile, seg, closed_profile=False, zfn=None, disp=None):
    """Sweep a (s, z, tag) profile around the plan curve. s == 0 collapses to a pole."""
    bm = bmesh.new()
    rings = []
    ts = [TAU * i / seg for i in range(seg)]
    for s, z, tag in profile:
        if s <= 1e-9:
            x, y = plan(0, 0)
            zz = zfn(0, s, z) if zfn else z
            co = Vector((x, y, zz))
            if disp:
                co = disp(co, 0, s, z, tag)
            v = bm.verts.new(co)
            rings.append([v] * seg)
            continue
        ring = []
        for t in ts:
            x, y = plan(t, s)
            zz = zfn(t, s, z) if zfn else z
            co = Vector((x, y, zz))
            if disp:
                co = disp(co, t, s, z, tag)
            ring.append(bm.verts.new(co))
        rings.append(ring)
    n = len(rings)
    for k in range(n if closed_profile else n - 1):
        r0, r1 = rings[k], rings[(k + 1) % n]
        for i in range(seg):
            j = (i + 1) % seg
            quad = []
            for v in (r0[i], r0[j], r1[j], r1[i]):
                if v not in quad:
                    quad.append(v)
            if len(quad) >= 3:
                bm.faces.new(quad)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def cylinder(radius, z0, z1, x=0.0, y=0.0, seg=48, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=radius, radius2=radius, depth=z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((x, y, (z0 + z1) / 2)))
    if bevel > 0:
        rim = [e for e in bm.edges if not e.is_contiguous or e.calc_face_angle(0) > 0.5]
        bmesh.ops.bevel(bm, geom=rim, offset=bevel, segments=2, affect="EDGES", profile=0.5)
    return bm


def tube(points, radius, seg=16):
    """Round tube along a polyline, capped. Built from a curve object for clean joins."""
    cu = bpy.data.curves.new("tmp_tube", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = max(2, seg // 4)
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for p, co in zip(sp.points, points):
        p.co = (co[0], co[1], co[2], 1)
    ob = bpy.data.objects.new("tmp_tube", cu)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bm = bmesh.new()
    bm.from_mesh(me)
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    bpy.data.meshes.remove(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def rounded_path(pts, r=0.02, steps=6):
    """Fillet polyline corners with quadratic arcs."""
    out = [Vector(pts[0])]
    for i in range(1, len(pts) - 1):
        p0, p1, p2 = Vector(pts[i - 1]), Vector(pts[i]), Vector(pts[i + 1])
        a = p1 + (p0 - p1).normalized() * min(r, (p0 - p1).length / 2)
        b = p1 + (p2 - p1).normalized() * min(r, (p2 - p1).length / 2)
        for k in range(steps + 1):
            u = k / steps
            out.append((1 - u) ** 2 * a + 2 * (1 - u) * u * p1 + u * u * b)
    out.append(Vector(pts[-1]))
    return out


def merge(bms):
    me = bpy.data.meshes.new("tmp_merge")
    out = bmesh.new()
    for bm in bms:
        bm.to_mesh(me)
        out.from_mesh(me)
        bm.free()
    bpy.data.meshes.remove(me)
    return out


# ---------------------------------------------------------------- part geometry

Z = SPEC["zones"]


def skin_scale(z):
    """Plan scale of the continuous monolith skin at height z (one river-stone silhouette)."""
    sk = SPEC["skin"]
    zw = sk["widestZ"]
    if z >= zw:
        u = min(1.0, (z - zw) / (Z["shellTopPeak"] - zw))
        return (1 - u ** sk["upperExponent"]) ** (1 / sk["upperExponent"])
    u = min(1.0, (zw - z) / (zw - Z["bodyBottom"]))
    base = sk["baseScale"]
    return base + (1 - base) * (1 - u ** sk["lowerExponent"]) ** (1 / sk["lowerExponent"])


def build_shell_top(seg):
    st = SPEC["shellTop"]
    thk_s, thk_z = st["wallThicknessScale"], st["wallThickness"]
    peak, seam = Z["shellTopPeak"], Z["seam"]
    s0 = skin_scale(seam)
    zs = [seam + (peak - seam) * (1 - math.cos(k / 40 * math.pi / 2)) for k in range(41)]
    outer = [(skin_scale(z), z, "o") for z in reversed(zs)]  # pole -> rim
    outer[0] = (0.0, peak, "o")
    rim = [(s0, seam + 0.0015, "o"), (s0 - 0.0015, seam, "o"), (s0 - thk_s + 0.0015, seam, "i"), (s0 - thk_s, seam + 0.0015, "i")]
    inner = []
    for z in zs[1:]:
        zi = z - thk_z * (z - seam) / (peak - seam)
        inner.append((max(0.0, skin_scale(z) * (s0 - thk_s) / s0), zi, "i"))
    inner[-1] = (0.0, peak - thk_z, "i")

    def zfn(t, s, z):
        if z <= seam + 0.002:
            return z
        return seam + (z - seam) * (1 + st["peakBiasTowardLongEnd"] * math.cos(t) * 4 * s * (1 - s))

    shell = loft(outer[:-1] + [(outer[-1][0], outer[-1][1] + 0.003, "o")] + rim + inner, seg, zfn=zfn)
    return merge([shell, build_hinge_spine()])


def build_hinge_spine():
    """Slim steel spine at the short end: bridges the glass band and carries the lower-shell hinge."""
    sp = SPEC["hingeSpine"]
    z0, z1 = Z["lowerRim"], Z["seam"] + sp["overlapTop"]
    n = 16
    rings = []
    bm = bmesh.new()
    for k in range(n + 1):
        z = z0 + (z1 - z0) * k / n
        sk = skin_scale(min(z, Z["seam"]))
        x_in, y_c = plan(math.pi, sk - sp["embedScale"])
        x_out, _ = plan(math.pi, sk)
        x_out -= sp["proud"]
        w = sp["width"] / 2
        rings.append([bm.verts.new((x_in, y_c - w, z)), bm.verts.new((x_out, y_c - w, z)),
                      bm.verts.new((x_out, y_c + w, z)), bm.verts.new((x_in, y_c + w, z))])
    for k in range(n):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges], offset=0.0012, segments=2, affect="EDGES", profile=0.5)
    return bm


def liner_z(s):
    st = SPEC["shellTop"]
    si = SPEC["shellInner"]
    u = min(1.0, s / si["outerScale"])
    return 0.008 + 0.095 * (1 - u ** 2.2) ** (1 / 2.2)


def build_shell_inner(seg):
    si = SPEC["shellInner"]
    steps = 20
    top = []
    for k in range(steps + 1):
        s = si["outerScale"] - (si["outerScale"] - si["openingScale"]) * k / steps
        top.append((s, liner_z(s), "o"))
    bottom = [(s, z - si["thickness"], "i") for s, z, _ in reversed(top)]
    return loft(top + bottom, seg, closed_profile=True)


def build_shell_lower(seg):
    sl = SPEC["shellLower"]
    thk_s, plate = sl["wallThicknessScale"], sl["plateThickness"]
    rim_z, bot_z = Z["lowerRim"], Z["bodyBottom"]
    sr = skin_scale(rim_z)
    steps = 24
    zs = [rim_z + (bot_z - rim_z) * math.sin(k / steps * math.pi / 2) for k in range(steps + 1)]
    prof = [(sr - thk_s, rim_z, "i"), (sr - 0.0015, rim_z, "o"), (sr, rim_z - 0.0015, "o")]
    prof += [(skin_scale(z), z, "o") for z in zs[1:-1]]
    sb = skin_scale(bot_z)
    prof += [(sb - 0.004, bot_z + 0.001, "o"), (sb - 0.012, bot_z, "o"),
             (sl["apertureScale"] + sl["bezelStep"], bot_z, "o"),
             (sl["apertureScale"] + sl["bezelStep"], bot_z + sl["bezelDepth"] - 0.001, "o"),
             (sl["apertureScale"] + sl["bezelStep"] - 0.002, bot_z + sl["bezelDepth"], "o"),
             (sl["apertureScale"] + 0.0015, bot_z + sl["bezelDepth"], "o"), (sl["apertureScale"], bot_z + sl["bezelDepth"] + 0.0015, "o"),
             (sl["apertureScale"], bot_z + plate - 0.0015, "i"), (sl["apertureScale"] + 0.0015, bot_z + plate, "i")]
    inner = []
    for z in reversed(zs[1:-1]):
        if z < bot_z + plate + 0.004:
            continue
        inner.append((skin_scale(z) - thk_s, z, "i"))
    prof += [(sb - thk_s - 0.02, bot_z + plate, "i")] + inner
    return loft(prof, seg, closed_profile=True)


def glass_profile():
    g = SPEC["glass"]
    prof = []
    # inner bottom pole -> inner equator -> inner shoulder
    for k in range(20, -1, -1):
        s, zf = dome(k / 20, g["lowerExponent"])
        prof.append((g["innerEquatorScale"] * s, g["equatorZ"] - (g["equatorZ"] - g["innerBottomZ"]) * zf, "i"))
    for k in range(1, 13):
        u = k / 12
        s = g["innerEquatorScale"] - (g["innerEquatorScale"] - (g["lipScale"] - 0.035)) * (1 - math.cos(u * math.pi / 2))
        z = g["equatorZ"] + (g["lipZ"] - 0.004 - g["equatorZ"]) * math.sin(u * math.pi / 2)
        prof.append((s, z, "i"))
    # rolled lip
    prof += [(g["lipScale"] - 0.03, g["lipZ"], "l"), (g["lipScale"] - 0.015, g["lipZ"] + 0.0015, "l"), (g["lipScale"], g["lipZ"], "l")]
    # outer shoulder -> outer equator
    for k in range(1, 13):
        u = k / 12
        s = g["lipScale"] + (g["equatorScale"] - g["lipScale"]) * math.sin(u * math.pi / 2)
        z = g["lipZ"] - (g["lipZ"] - g["equatorZ"]) * (1 - math.cos(u * math.pi / 2))
        prof.append((s, z, "o"))
    # outer equator -> outer bottom pole
    for k in range(1, 21):
        s, zf = dome(k / 20, g["lowerExponent"])
        prof.append((g["equatorScale"] * s, g["equatorZ"] - (g["equatorZ"] - g["bottomZ"]) * zf, "o"))
    return prof


def glass_scale_at(z, surface="outer"):
    """Plan scale of the glass surface at height z in the lower half (z <= equator)."""
    g = SPEC["glass"]
    p = g["lowerExponent"]
    eq_s, bot = (g["equatorScale"], g["bottomZ"]) if surface == "outer" else (g["innerEquatorScale"], g["innerBottomZ"])
    zf = min(1.0, max(0.0, (g["equatorZ"] - z) / (g["equatorZ"] - bot)))
    return eq_s * (1 - zf ** p) ** (1 / p)


def build_glass(seg):
    g = SPEC["glass"]

    def disp(co, t, s, z, tag):
        # outward direction of the flattened vessel
        d = Vector((co.x / (A * A), co.y / (B * B), (co.z + 0.06) / (0.1 * 0.1)))
        d.normalize()
        if tag == "o":
            amp = g["surfaceNoiseM"] * noise.noise(co * 3.1 + Vector((1.7, 0.2, 5.3)))
        elif tag == "i":
            amp = g["thicknessNoiseM"] * noise.noise(co * 2.3 + Vector((8.1, 3.3, 0.4)))
        else:
            amp = 0.0006 * noise.noise(co * 9 + Vector((2, 2, 2)))
        return co + d * amp

    bm = loft(glass_profile(), seg, disp=disp)
    # a few small inclusions sealed inside the wall
    bubbles = []
    # (plan angle, height, radius): centres sit midway through the wall thickness
    rng = [(0.8, -0.05, 0.0014), (2.1, -0.062, 0.0009), (2.9, -0.085, 0.0011), (3.7, -0.055, 0.0007),
           (4.6, -0.095, 0.0012), (5.4, -0.07, 0.0008), (6.0, -0.105, 0.001)]
    for t, z, r in rng[: g["bubbles"]]:
        s_mid = 0.5 * (glass_scale_at(z, "outer") + glass_scale_at(z, "inner"))
        x, y = plan(t, s_mid)
        b = bmesh.new()
        bmesh.ops.create_uvsphere(b, u_segments=10, v_segments=6, radius=r)
        bmesh.ops.scale(b, vec=Vector((1.6, 1.0, 0.8)), verts=b.verts)
        bmesh.ops.translate(b, vec=Vector((x, y, z)), verts=b.verts)
        bmesh.ops.reverse_faces(b, faces=b.faces)  # cavity: normals point inward
        bubbles.append(b)
    return merge([bm] + bubbles)


def build_internal_frame(seg):
    """Neck clamp: the hand-blown vessel hangs from its rolled lip, gripped between an inner
    ring and an outer clamp ring, carried to the liner by three short posts."""
    fr = SPEC["internalFrame"]
    g = SPEC["glass"]
    lip_z = g["lipZ"]
    inner = [(fr["innerRing"][0], lip_z - 0.014, "o"), (fr["innerRing"][1], lip_z - 0.014, "o"),
             (fr["innerRing"][1], lip_z + 0.004, "o"), (fr["innerRing"][0], lip_z + 0.004, "o")]
    clamp = [(fr["clampRing"][0], lip_z + 0.0025, "o"), (fr["clampRing"][1], lip_z + 0.0025, "o"),
             (fr["clampRing"][1], lip_z + 0.011, "o"), (fr["clampRing"][0], lip_z + 0.011, "o")]
    parts = [loft(inner, seg, closed_profile=True), loft(clamp, seg, closed_profile=True)]
    # bridge the two rings over the lip
    bridge = [(fr["innerRing"][0], lip_z + 0.004, "o"), (fr["clampRing"][1], lip_z + 0.011, "o"),
              (fr["clampRing"][1], lip_z + 0.015, "o"), (fr["innerRing"][0], lip_z + 0.015, "o")]
    parts.append(loft(bridge, seg, closed_profile=True))
    for t in fr["postAngles"]:
        x, y = plan(t, fr["postScale"])
        top = liner_z(fr["postScale"]) - SPEC["shellInner"]["thickness"] - 0.0005
        parts.append(cylinder(fr["postRadius"], lip_z + 0.014, top, x, y, seg=24))
    return merge(parts), lip_z


def build_light_source(seg):
    L = SPEC["light"]
    r = L["sourceTubeRadius"]
    prof = []
    for k in range(16):
        a = TAU * k / 16
        prof.append((L["sourceScale"] + (r / 0.4) * math.cos(a), L["sourceZ"] + r * math.sin(a), "o"))
    parts = [loft(prof, seg, closed_profile=True)]
    for t in (0.6, 2.7, 4.8):  # hangers to the heatsink
        x0, y0 = plan(t, L["sourceScale"])
        x1, y1 = plan(t, L["heatsinkOuter"] - 0.07)
        parts.append(tube([(x0, y0, L["sourceZ"] + r * 0.6), (x1, y1, 0.001)], 0.0016, seg=8))
    return merge(parts)


def build_light_diffuser(seg):
    L = SPEC["light"]
    ds, dz = L["diffuserScale"], L["diffuserZ"]
    prof = [(0.0, dz - 0.004, "o")]
    for k in range(1, 13):
        s = ds * k / 12
        prof.append((s, dz - 0.004 + 0.003 * (s / ds) ** 2, "o"))
    prof.append((ds, dz + 0.001, "o"))
    for k in range(12, -1, -1):
        s = ds * k / 12
        prof.append((s, dz + 0.002 + 0.002 * (s / ds) ** 2, "i"))
    parts = [loft(prof, seg)]
    for t in (1.0, 3.1, 5.2):
        x0, y0 = plan(t, ds - 0.03)
        x1, y1 = plan(t, L["sourceScale"] - 0.01)
        parts.append(tube([(x0, y0, dz + 0.002), (x1, y1, L["sourceZ"] - L["sourceTubeRadius"] * 0.6)], 0.0012, seg=8))
    return merge(parts)


def build_heatsink(seg):
    L = SPEC["light"]
    si, so = L["heatsinkInner"], L["heatsinkOuter"]
    base = [(si, 0.0, "o"), (so, 0.0, "o"), (so, 0.012, "o"), (si, 0.012, "o")]
    parts = [loft(base, seg, closed_profile=True)]
    for k in range(L["heatsinkFins"]):
        t = TAU * k / L["heatsinkFins"]
        x0, y0 = plan(t, si + 0.02)
        x1, y1 = plan(t, so - 0.02)
        fin = bmesh.new()
        bmesh.ops.create_cube(fin, size=1.0)
        length = math.hypot(x1 - x0, y1 - y0)
        bmesh.ops.scale(fin, vec=Vector((length, 0.0015, 0.022)), verts=fin.verts)
        bmesh.ops.rotate(fin, cent=Vector(), matrix=Matrix.Rotation(math.atan2(y1 - y0, x1 - x0), 3, "Z"), verts=fin.verts)
        bmesh.ops.translate(fin, vec=Vector(((x0 + x1) / 2, (y0 + y1) / 2, 0.012 + 0.011)), verts=fin.verts)
        parts.append(fin)
    # collar rising through the liner opening into the upper plenum
    opening = SPEC["shellInner"]["openingScale"]
    collar = [(0.47, 0.034, "o"), (opening - 0.006, 0.034, "o"), (opening - 0.006, 0.104, "o"), (0.47, 0.104, "o")]
    parts.append(loft(collar, seg, closed_profile=True))
    return merge(parts)


def build_suspension(seg):
    su = SPEC["suspension"]
    gx, gy = su["gripOffset"]
    s_at = math.hypot(gx / A, gy / B)
    sk = SPEC["skin"]
    u = (1 - s_at ** sk["upperExponent"]) ** (1 / sk["upperExponent"])
    z_raw = sk["widestZ"] + u * (Z["shellTopPeak"] - sk["widestZ"])
    t_at = math.atan2(gy / B, gx / A)
    zs = Z["seam"] + (z_raw - Z["seam"]) * (1 + SPEC["shellTop"]["peakBiasTowardLongEnd"] * math.cos(t_at) * 4 * s_at * (1 - s_at))
    grip = merge([
        cylinder(0.031, zs - 0.002, zs + 0.008, gx, gy, seg=64, bevel=0.0015),
        cylinder(su["gripRadius"], zs + 0.008, su["gripTop"], gx, gy, seg=64, bevel=0.002),
    ])
    rod = merge([
        cylinder(su["rodRadius"], su["gripTop"], su["rodTop"], gx, gy, seg=32),
        cylinder(0.0085, su["rodTop"] - 0.02, su["rodTop"] + 0.012, gx, gy, seg=32, bevel=0.001),
    ])
    cable = cylinder(su["cableRadius"], su["rodTop"] + 0.012, su["ceilingZ"] - 0.014, gx, gy, seg=12)
    mount = merge([
        cylinder(su["mountRadius"], su["ceilingZ"], su["ceilingZ"] + 0.028, gx, gy, seg=64, bevel=0.003),
        cylinder(0.011, su["ceilingZ"] - 0.014, su["ceilingZ"], gx, gy, seg=32, bevel=0.001),
    ])
    return {"GRIP": grip, "SUSPENSION_ROD": rod, "SUSPENSION_CABLE": cable, "CEILING_MOUNT": mount}, (gx, gy, zs)


# ---------------------------------------------------------------- scene assembly

def make_materials():
    def mat(name, color, metallic, rough, transmission=0.0, emission=None, ior=1.5):
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = (*color, 1)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Transmission Weight"].default_value = transmission
        bsdf.inputs["IOR"].default_value = ior
        if emission:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1)
            bsdf.inputs["Emission Strength"].default_value = 1.0
        return m

    return {
        "N01_Steel_Blackened": mat("N01_Steel_Blackened", (0.012, 0.013, 0.014), 1.0, 0.36),
        "N01_Steel_Interior": mat("N01_Steel_Interior", (0.03, 0.028, 0.026), 1.0, 0.45),
        "N01_Glass_Optical": mat("N01_Glass_Optical", (0.97, 0.97, 0.96), 0.0, 0.03, transmission=1.0),
        "N01_Emitter": mat("N01_Emitter", (0.9, 0.62, 0.33), 0.0, 0.5, emission=(0.80, 0.37, 0.10)),
        "N01_Diffuser": mat("N01_Diffuser", (0.9, 0.88, 0.85), 0.0, 0.6, transmission=0.6),
        "N01_Suspension_Black": mat("N01_Suspension_Black", (0.008, 0.008, 0.009), 0.9, 0.5),
        "N01_Cable": mat("N01_Cable", (0.01, 0.01, 0.01), 0.0, 0.7),
    }


def add_object(name, bm, parent, pivot, material, extras=None, sharp_angle=None):
    """Create a mesh object whose origin sits exactly on the authored pivot."""
    bmesh.ops.translate(bm, verts=bm.verts, vec=-Vector(pivot))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    if sharp_angle:
        me.set_sharp_from_angle(angle=math.radians(sharp_angle))
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = parent
    ob.location = Vector(pivot) - (parent.matrix_world.translation if parent else Vector())
    for k, v in (extras or {}).items():
        ob[k] = v
    return ob


def add_group(name, parent, pivot=(0, 0, 0), extras=None):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = "PLAIN_AXES"
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = parent
    ob.location = Vector(pivot)
    for k, v in (extras or {}).items():
        ob[k] = v
    bpy.context.view_layer.update()
    return ob


def to_gltf(v):
    """Blender Z-up -> glTF Y-up."""
    return [round(v[0], 6), round(v[2], 6), round(-v[1], 6)]


def build(seg):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = make_materials()
    spec_hash = hashlib.sha256(open(SPEC_PATH, "rb").read()).hexdigest()[:16]
    root = add_group("N01_ROOT", None, extras={
        "n01_spec_version": SPEC["version"], "n01_spec_sha": spec_hash, "n01_stage": SPEC["stage"],
        "units": "m", "note": "Fictional concept object. Dimensions are conceptual.",
    })
    susp = add_group("SUSPENSION", root)
    shell = add_group("SHELL", root)
    light = add_group("LIGHT_ASSEMBLY", root)

    sus_parts, grip_pt = build_suspension(seg)
    su = SPEC["suspension"]
    gx, gy, zs = grip_pt
    add_object("CEILING_MOUNT", sus_parts["CEILING_MOUNT"], susp, (gx, gy, su["ceilingZ"]), mats["N01_Suspension_Black"],
               {"pivot": "ceiling attachment"}, sharp_angle=40)
    add_object("SUSPENSION_CABLE", sus_parts["SUSPENSION_CABLE"], susp, (gx, gy, su["ceilingZ"] - 0.014), mats["N01_Cable"],
               {"pivot": "cable top"}, sharp_angle=40)
    add_object("SUSPENSION_ROD", sus_parts["SUSPENSION_ROD"], susp, (gx, gy, su["rodTop"] + 0.012), mats["N01_Suspension_Black"],
               {"pivot": "rod top (swing point)"}, sharp_angle=40)
    add_object("GRIP", sus_parts["GRIP"], susp, grip_pt, mats["N01_Suspension_Black"],
               {"pivot": "grip seat on shell"}, sharp_angle=40)

    add_object("SHELL_TOP", build_shell_top(seg), shell, grip_pt, mats["N01_Steel_Blackened"],
               {"pivot": "grip axis (yaw only)", "yawAxis": to_gltf((0, 0, 1))}, sharp_angle=60)
    add_object("SHELL_INNER", build_shell_inner(seg), shell, grip_pt, mats["N01_Steel_Interior"],
               {"pivot": "grip axis, follows SHELL_TOP"}, sharp_angle=60)

    sl = SPEC["shellLower"]
    hx, hy = plan(math.pi, skin_scale(Z["lowerRim"]))
    hinge = (hx, hy, Z["lowerRim"])
    add_object("SHELL_LOWER", build_shell_lower(seg), shell, hinge, mats["N01_Steel_Blackened"], {
        "pivot": "hinge at short end, lower rim",
        "hingeAxis": to_gltf((0, 1, 0)),
        "openAngleDeg": SPEC["poses"]["anatomyOpen"]["SHELL_LOWER"]["hingeRotationDeg"],
    }, sharp_angle=60)

    frame_bm, cz = build_internal_frame(seg)
    add_object("INTERNAL_FRAME", frame_bm, shell, (0, 0, cz), mats["N01_Steel_Interior"], {"pivot": "neck clamp centre"}, sharp_angle=50)

    add_object("GLASS_CORE", build_glass(seg), root, (0, 0, -0.06), mats["N01_Glass_Optical"], {"pivot": "vessel centre"})

    L = SPEC["light"]
    add_object("LIGHT_SOURCE", build_light_source(seg), light, (0, 0, L["sourceZ"]), mats["N01_Emitter"], {"pivot": "ring centre"})
    add_object("LIGHT_DIFFUSER", build_light_diffuser(seg), light, (0, 0, L["diffuserZ"]), mats["N01_Diffuser"], {"pivot": "lens centre"})
    add_object("HEATSINK_RING", build_heatsink(seg), light, (0, 0, 0.0), mats["N01_Steel_Interior"], {"pivot": "ring base centre"}, sharp_angle=40)
    bpy.context.view_layer.update()
    return root


# ---------------------------------------------------------------- validation

MESH_NODES = [n for kids in SPEC["hierarchy"].values() for n in kids if n not in SPEC["hierarchy"]]


def world_bm(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    oe = ob.evaluated_get(dg)
    me = oe.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.transform(ob.matrix_world)
    oe.to_mesh_clear()
    return bm


def clashes(names):
    objs = {n: bpy.data.objects[n] for n in names}
    trees = {}
    for n, ob in objs.items():
        bm = world_bm(ob)
        trees[n] = BVHTree.FromBMesh(bm)
        bm.free()
    allowed = {tuple(sorted(p)) for p in SPEC["allowedContacts"]}
    found = []
    keys = sorted(trees)
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            if tuple(sorted((a, b))) in allowed:
                continue
            hits = trees[a].overlap(trees[b])
            if hits:
                found.append({"a": a, "b": b, "triangles": len(hits)})
    return found


def set_pose(open_):
    pose = SPEC["poses"]["anatomyOpen"]
    lower = bpy.data.objects["SHELL_LOWER"]
    top = bpy.data.objects["SHELL_TOP"]
    inner = bpy.data.objects["SHELL_INNER"]
    glass = bpy.data.objects["GLASS_CORE"]
    for ob in (lower, top, inner, glass):
        if "rest_loc" not in ob:
            ob["rest_loc"] = list(ob.location)
        ob.location = Vector(ob["rest_loc"])
        ob.rotation_euler = (0, 0, 0)
    if open_:
        lower.rotation_euler = (0, math.radians(pose["SHELL_LOWER"]["hingeRotationDeg"]), 0)
        lower.location += Vector(pose["SHELL_LOWER"]["translate"])
        top.rotation_euler = (0, 0, math.radians(pose["SHELL_TOP"]["yawDeg"]))
        glass.location += Vector(pose["GLASS_CORE"]["translate"])
    bpy.context.view_layer.update()


def validate():
    report = {"errors": [], "warnings": [], "nodes": {}, "clearance": {}}
    for parent, kids in SPEC["hierarchy"].items():
        for k in kids:
            ob = bpy.data.objects.get(k)
            if not ob:
                report["errors"].append(f"missing node {k}")
            elif ob.parent is None or ob.parent.name != parent:
                report["errors"].append(f"{k} parent is {ob.parent.name if ob.parent else None}, expected {parent}")
    for n in MESH_NODES:
        ob = bpy.data.objects[n]
        bm = world_bm(ob)
        non_manifold = sum(1 for e in bm.edges if not e.is_manifold)
        degenerate = sum(1 for f in bm.faces if f.calc_area() < 1e-12)
        volume = bm.calc_volume(signed=True)
        xs = [v.co.x for v in bm.verts]
        ys = [v.co.y for v in bm.verts]
        zs = [v.co.z for v in bm.verts]
        report["nodes"][n] = {
            "triangles": sum(len(f.verts) - 2 for f in bm.faces),
            "nonManifoldEdges": non_manifold,
            "degenerateFaces": degenerate,
            "signedVolumeL": round(volume * 1000, 4),
            "materials": [m.name for m in ob.data.materials],
            "pivotWorld": [round(c, 4) for c in ob.matrix_world.translation],
            "boundsMin": [round(min(xs), 4), round(min(ys), 4), round(min(zs), 4)],
            "boundsMax": [round(max(xs), 4), round(max(ys), 4), round(max(zs), 4)],
        }
        if non_manifold:
            report["errors"].append(f"{n}: {non_manifold} non-manifold edges")
        if degenerate:
            report["errors"].append(f"{n}: {degenerate} degenerate faces")
        if volume <= 0:
            report["errors"].append(f"{n}: normals point inward (signed volume {volume:.6f})")
        if [m.name for m in ob.data.materials] != SPEC["materials"][n]:
            report["errors"].append(f"{n}: material slots {[m.name for m in ob.data.materials]}")
        bm.free()

    body = ["SHELL_TOP", "SHELL_LOWER", "GLASS_CORE"]
    mn = [min(report["nodes"][n]["boundsMin"][i] for n in body) for i in range(3)]
    mx = [max(report["nodes"][n]["boundsMax"][i] for n in body) for i in range(3)]
    tg = SPEC["targets"]
    dims = {"width": mx[0] - mn[0], "depth": mx[1] - mn[1], "height": mx[2] - mn[2], "extentPlusX": mx[0], "extentMinusX": -mn[0]}
    dims["endExtension"] = dims["extentPlusX"] - dims["extentMinusX"]
    report["bodyDimensionsMm"] = {k: round(v * 1000, 1) for k, v in dims.items()}
    for key, target in (("width", tg["bodyWidth"]), ("depth", tg["bodyDepth"]), ("height", tg["bodyHeight"])):
        if abs(dims[key] - target) > tg["toleranceM"]:
            report["errors"].append(f"body {key} {dims[key]*1000:.1f} mm outside target {target*1000:.0f} mm")
    lo, hi = tg["endExtensionRangeM"]
    if not lo <= dims["endExtension"] <= hi:
        report["errors"].append(f"end extension {dims['endExtension']*1000:.1f} mm outside {lo*1000:.0f}-{hi*1000:.0f} mm")

    set_pose(False)
    report["clearance"]["closed"] = clashes(MESH_NODES)
    set_pose(True)
    report["clearance"]["anatomyOpen"] = clashes(MESH_NODES)
    set_pose(False)
    for state, found in report["clearance"].items():
        for c in found:
            report["errors"].append(f"{state}: {c['a']} intersects {c['b']} ({c['triangles']} triangle pairs)")
    return report


# ---------------------------------------------------------------- export

def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for ob in bpy.data.objects:
        for key in ("rest_loc",):
            if key in ob:
                del ob[key]
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", export_extras=True, export_yup=True, export_apply=True,
        export_cameras=False, export_lights=False, export_normals=True, export_texcoords=True,
        export_materials="EXPORT", export_animations=False,
    )


# ---------------------------------------------------------------- review renders

def review_materials():
    def m(name, color, rough, transmission=0.0, metallic=0.0):
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        b = mat.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*color, 1)
        b.inputs["Roughness"].default_value = rough
        b.inputs["Metallic"].default_value = metallic
        b.inputs["Transmission Weight"].default_value = transmission
        return mat

    clay = m("review_clay", (0.22, 0.22, 0.22), 0.5)
    clay_dark = m("review_clay_dark", (0.09, 0.09, 0.09), 0.5)
    clay_light = m("review_clay_light", (0.5, 0.5, 0.48), 0.6)
    glass = m("review_glass", (0.92, 0.94, 0.95), 0.02, transmission=1.0)
    table = {
        "SHELL_TOP": clay, "SHELL_LOWER": clay, "SHELL_INNER": clay_dark, "INTERNAL_FRAME": clay_dark,
        "GLASS_CORE": glass, "LIGHT_SOURCE": clay_light, "LIGHT_DIFFUSER": clay_light, "HEATSINK_RING": clay_dark,
        "CEILING_MOUNT": clay_dark, "SUSPENSION_CABLE": clay_dark, "SUSPENSION_ROD": clay_dark, "GRIP": clay_dark,
    }
    for n, mat in table.items():
        bpy.data.objects[n].data.materials[0] = mat


def look_at(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def render_views(out_dir, samples):
    os.makedirs(out_dir, exist_ok=True)
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = samples
    scn.cycles.use_denoising = True
    scn.cycles.max_bounces = 12
    scn.cycles.transmission_bounces = 12
    scn.render.resolution_x, scn.render.resolution_y = 1600, 1000
    scn.render.image_settings.file_format = "PNG"
    scn.view_settings.view_transform = "AgX"
    scn.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("review")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.26, 0.26, 0.26, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    scn.world = world

    def area(name, loc, power, size):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = power
        ld.size = size
        ob = bpy.data.objects.new(name, ld)
        scn.collection.objects.link(ob)
        ob.location = loc
        look_at(ob, (0, 0, -0.02))

    area("key", (1.8, -2.2, 2.2), 380, 2.5)
    area("fill", (-2.4, -1.2, 0.3), 110, 3.0)
    area("rim", (0.3, 2.6, 1.2), 220, 2.0)
    area("under", (0.2, -0.4, -2.4), 70, 3.0)

    review_materials()
    cam_data = bpy.data.cameras.new("review_cam")
    cam = bpy.data.objects.new("review_cam", cam_data)
    scn.collection.objects.link(cam)
    scn.camera = cam

    views = [
        ("01-front-three-quarter", False, (1.45, -1.7, 0.42), (0.02, 0, -0.01), 50, None),
        ("02-side-elevation", False, (0.0, -3.4, -0.02), (0.0, 0, -0.02), 85, None),
        ("03-top-three-quarter", False, (1.05, -0.95, 1.55), (0.0, 0, -0.02), 40, None),
        ("04-beneath", False, (0.32, -0.62, -1.15), (0.0, 0, -0.07), 35, None),
        ("05-shell-open", True, (1.35, -1.55, -0.3), (0.0, 0, -0.08), 45, None),
        ("06-plan-ortho", False, (0.0, 0.0, 3.0), (0.0, 0, 0), None, 1.2),
        ("07-elevation-ortho", False, (0.0, -3.0, -0.02), (0.0, 0, -0.02), None, 1.2),
        ("08-end-elevation-ortho", False, (3.0, 0.0, -0.02), (0.0, 0, -0.02), None, 1.2),
    ]
    written = []
    for name, open_, loc, target, focal, ortho in views:
        set_pose(open_)
        cam.location = loc
        if name == "06-plan-ortho":
            cam.rotation_euler = (0, 0, 0)
        else:
            look_at(cam, target)
        if ortho:
            cam_data.type = "ORTHO"
            cam_data.ortho_scale = ortho
        else:
            cam_data.type = "PERSP"
            cam_data.lens = focal
        cam_data.clip_start = 0.01
        path = os.path.join(out_dir, name + ".png")
        scn.render.filepath = path
        bpy.ops.render.render(write_still=True)
        written.append({"file": name + ".png", "orthoScaleM": ortho, "resolution": [1600, 1000]})
        print("rendered", name, flush=True)
    set_pose(False)
    return written


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "public", "models", "nocturne"))
    ap.add_argument("--report", default=os.path.join(ROOT, "clients", "nocturne", "review", "n01-blockout-report.json"))
    ap.add_argument("--render", action="store_true")
    ap.add_argument("--render-dir", default=os.path.join(ROOT, "test-results", "nocturne", "blockout-png"))
    ap.add_argument("--samples", type=int, default=64)
    args = ap.parse_args()

    full = {"spec": os.path.relpath(SPEC_PATH, ROOT), "blender": bpy.app.version_string, "variants": {}}
    failed = False
    renders = None
    for variant in ("low", "high"):
        seg = SPEC["variants"][variant]["segments"]
        build(seg)
        rep = validate()
        path = os.path.join(args.out, "n01.glb" if variant == "high" else "n01-low.glb")
        if not rep["errors"]:
            export(path)
            rep["glb"] = os.path.relpath(path, ROOT)
            rep["glbBytes"] = os.path.getsize(path)
        full["variants"][variant] = rep
        failed = failed or bool(rep["errors"])
        print(variant, "errors:", len(rep["errors"]), flush=True)
        for e in rep["errors"]:
            print("  -", e)
        if variant == "high" and args.render and not rep["errors"]:
            renders = render_views(args.render_dir, args.samples)
    if renders:
        full["renders"] = {"dir": os.path.relpath(args.render_dir, ROOT), "views": renders}
    os.makedirs(os.path.dirname(args.report), exist_ok=True)
    with open(args.report, "w") as fh:
        json.dump(full, fh, indent=2)
    print("report", os.path.relpath(args.report, ROOT))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
