#!/usr/bin/env python3
"""
Génère 3 sorties vélo d'exemple (fichiers GPX) autour du lac d'Annecy, pour la démo
de la page « Mes sorties ». Ce ne sont PAS de vraies traces enregistrées : le tracé relie
des points de passage réels par des segments droits, avec une altitude et une vitesse
simulées (plus lent en montée, plus rapide en descente).

Usage : python3 data-prep/make_sample_gpx.py  ->  écrit public/samples/*.gpx
"""
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "samples"

# Points de passage : (nom, latitude, longitude, altitude en m)
ANNECY = ("Annecy", 45.8992, 6.1294, 448)
SEVRIER = ("Sévrier", 45.8644, 6.1403, 452)
ST_JORIOZ = ("Saint-Jorioz", 45.8312, 6.1597, 455)
DUINGT = ("Duingt", 45.8283, 6.2020, 456)
BOUT_DU_LAC = ("Bout-du-Lac", 45.7890, 6.2140, 450)
DOUSSARD = ("Doussard", 45.7750, 6.2228, 465)
TALLOIRES = ("Talloires", 45.8406, 6.2128, 470)
BLUFFY = ("Col de Bluffy", 45.8692, 6.2167, 630)
MENTHON = ("Menthon-Saint-Bernard", 45.8603, 6.1950, 480)
VEYRIER = ("Veyrier-du-Lac", 45.8828, 6.1747, 470)
ROVAGNY = ("Rovagny", 45.8280, 6.2290, 760)
FORCLAZ = ("Col de la Forclaz", 45.8128, 6.2468, 1157)
MONTMIN = ("Montmin", 45.8090, 6.2630, 1050)
VESONNE = ("Vesonne", 45.7840, 6.2420, 560)

RIDES = [
    {
        "file": "tour-du-lac-annecy.gpx",
        "name": "Tour du lac d'Annecy",
        "start": datetime(2026, 8, 23, 7, 30, tzinfo=timezone.utc),
        "route": [ANNECY, SEVRIER, ST_JORIOZ, DUINGT, BOUT_DU_LAC, TALLOIRES, BLUFFY, MENTHON, VEYRIER, ANNECY],
        "flat_speed": 27.0,
    },
    {
        "file": "col-de-la-forclaz.gpx",
        "name": "Col de la Forclaz par Talloires",
        "start": datetime(2026, 9, 12, 7, 0, tzinfo=timezone.utc),
        "route": [ANNECY, VEYRIER, MENTHON, TALLOIRES, ROVAGNY, FORCLAZ, MONTMIN, VESONNE, DOUSSARD,
                  BOUT_DU_LAC, DUINGT, ST_JORIOZ, SEVRIER, ANNECY],
        "flat_speed": 26.0,
    },
    {
        "file": "sortie-recup.gpx",
        "name": "Sortie récup, rive ouest",
        "start": datetime(2026, 10, 4, 13, 15, tzinfo=timezone.utc),
        "route": [ANNECY, SEVRIER, ST_JORIOZ, SEVRIER, ANNECY],
        "flat_speed": 22.0,
    },
]

STEP_KM = 0.03  # un point tous les ~30 m, comme un compteur GPS


def haversine_km(a, b):
    r = 6371.0088
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def build(ride, rng):
    points = []
    t = ride["start"]
    for (_, la1, lo1, e1), (_, la2, lo2, e2) in zip(ride["route"], ride["route"][1:]):
        seg_km = haversine_km((la1, lo1), (la2, lo2))
        n = max(1, int(seg_km / STEP_KM))
        grade = (e2 - e1) / (seg_km * 1000)
        # Vitesse simulée : -1,8 km/h par % de pente en montée, +1 km/h par % en descente.
        speed = ride["flat_speed"] - 180 * grade if grade > 0 else ride["flat_speed"] - 100 * grade
        speed = max(9.0, min(speed, 55.0))
        for i in range(n):
            f = i / n
            lat = la1 + (la2 - la1) * f + rng.gauss(0, 0.00002)
            lon = lo1 + (lo2 - lo1) * f + rng.gauss(0, 0.00002)
            ele = e1 + (e2 - e1) * f + rng.gauss(0, 0.6)
            points.append((lat, lon, ele, t))
            v = max(5.0, speed + rng.gauss(0, 1.2))
            t += timedelta(seconds=(seg_km / n) / v * 3600)
    last = ride["route"][-1]
    points.append((last[1], last[2], last[3], t))
    return points


def to_gpx(name, points):
    rows = "\n".join(
        f'      <trkpt lat="{lat:.6f}" lon="{lon:.6f}"><ele>{ele:.1f}</ele>'
        f'<time>{t.strftime("%Y-%m-%dT%H:%M:%SZ")}</time></trkpt>'
        for lat, lon, ele, t in points
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Cyclingstats data-prep (trace générée)" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>{name}</name><desc>Sortie d'exemple générée, pas une trace enregistrée.</desc></metadata>
  <trk><name>{name}</name><trkseg>
{rows}
  </trkseg></trk>
</gpx>
"""


OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(2026)
for ride in RIDES:
    pts = build(ride, rng)
    (OUT / ride["file"]).write_text(to_gpx(ride["name"], pts), encoding="utf-8")
    km = sum(haversine_km(a[:2], b[:2]) for a, b in zip(pts, pts[1:]))
    print(f"OK -> {ride['file']} : {len(pts)} points, {km:.1f} km, {(pts[-1][3] - pts[0][3])}")
