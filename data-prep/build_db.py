#!/usr/bin/env python3
"""
Génère src/mocks/data/db.json (fausse API servie par MSW) pour le Tour de France 2026.

Source principale : Wikipedia « 2026 Tour de France » (tableaux des étapes et
classements finaux), recoupée avec OA Sport et CyclingUpToDate.
Usage : python build_db.py  ->  écrit src/mocks/data/db.json.
"""
import json
import re
import unicodedata
from pathlib import Path

# --------------------------------------------------------------------------
# Utilitaires
# --------------------------------------------------------------------------
SPECIAL = {"ø": "o", "Ø": "O", "æ": "ae", "Æ": "AE", "ł": "l", "Ł": "L", "ß": "ss"}


def slugify(name: str) -> str:
    for k, v in SPECIAL.items():
        name = name.replace(k, v)
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    name = re.sub(r"[^a-zA-Z0-9]+", "-", name).strip("-").lower()
    return name


def to_seconds(t: str) -> int:
    """'6:26' -> 386 ; '1:02:23' -> 3743 ; '73:56:26' -> 266186"""
    parts = [int(p) for p in t.split(":")]
    s = 0
    for p in parts:
        s = s * 60 + p
    return s


# --------------------------------------------------------------------------
# Équipes (23)
# --------------------------------------------------------------------------
TEAMS = {
    "ALP": ("Alpecin–Premier Tech", "WorldTeam"),
    "DEC": ("Decathlon CMA CGM", "WorldTeam"),
    "EFE": ("EF Education–EasyPost", "WorldTeam"),
    "GFU": ("Groupama–FDJ United", "WorldTeam"),
    "LTK": ("Lidl–Trek", "WorldTeam"),
    "LOT": ("Lotto–Intermarché", "WorldTeam"),
    "MOV": ("Movistar Team", "WorldTeam"),
    "INE": ("Netcompany INEOS", "WorldTeam"),
    "NSN": ("NSN Cycling Team", "WorldTeam"),
    "RBH": ("Red Bull–Bora–Hansgrohe", "WorldTeam"),
    "SOQ": ("Soudal–Quick-Step", "WorldTeam"),
    "BAH": ("Team Bahrain Victorious", "WorldTeam"),
    "JAY": ("Team Jayco–AlUla", "WorldTeam"),
    "PIC": ("Team Picnic–PostNL", "WorldTeam"),
    "UAE": ("UAE Team Emirates XRG", "WorldTeam"),
    "UNO": ("Uno-X Mobility", "WorldTeam"),
    "VIS": ("Visma–Lease a Bike", "WorldTeam"),
    "XDS": ("XDS Astana Team", "WorldTeam"),
    "TUD": ("Tudor Pro Cycling Team", "ProTeam"),
    "PIN": ("Pinarello–Q36.5 Pro Cycling Team", "ProTeam"),
    "COF": ("Cofidis", "ProTeam"),
    "TEN": ("Team TotalEnergies", "ProTeam"),
    "CRS": ("Caja Rural–Seguros RGA", "ProTeam"),
}
TEAM_ID = {k: slugify(v[0]) for k, v in TEAMS.items()}

# --------------------------------------------------------------------------
# Classement général final : rang | nom | nationalité | équipe | temps/écart
# --------------------------------------------------------------------------
GC_RAW = """
1|Tadej Pogačar|SLO|UAE|73:56:26
2|Remco Evenepoel|BEL|RBH|6:26
3|Isaac del Toro|MEX|UAE|9:42
4|Paul Seixas|FRA|DEC|11:56
5|Lenny Martinez|FRA|BAH|13:02
6|Mattias Skjelmose|DEN|LTK|14:59
7|Juan Ayuso|ESP|LTK|17:48
8|Richard Carapaz|ECU|EFE|20:00
9|Tom Pidcock|GBR|PIN|29:28
10|Jordan Jegat|FRA|TEN|33:21
11|Yannis Voisard|SUI|TUD|38:02
12|Tobias Halland Johannessen|NOR|UNO|56:37
13|Sepp Kuss|USA|VIS|1:02:23
14|Davide Piganzoli|ITA|VIS|1:03:43
15|Jai Hindley|AUS|RBH|1:23:28
16|Nicolas Prodhomme|FRA|DEC|1:25:01
17|Tiesj Benoot|BEL|DEC|1:32:56
18|Quinn Simmons|USA|LTK|1:35:28
19|Sean Quinn|USA|EFE|1:47:05
20|Egan Bernal|COL|INE|1:47:58
21|Adam Yates|GBR|UAE|1:51:59
22|Thymen Arensman|NED|INE|2:02:42
23|Carlos Verona|ESP|LTK|2:05:22
24|Matthew Riccitello|USA|DEC|2:11:09
25|Derek Gee-West|CAN|LTK|2:12:59
26|Harold Tejada|COL|XDS|2:19:47
27|Maxim Van Gils|BEL|RBH|2:24:09
28|Ben O'Connor|AUS|JAY|2:31:38
29|Pablo Castrillo|ESP|MOV|2:31:43
30|Matteo Jorgenson|USA|VIS|2:33:29
31|Guillaume Martin|FRA|GFU|2:34:15
32|Felix Großschartner|AUT|UAE|2:43:22
33|Mattia Cattaneo|ITA|RBH|2:51:19
34|Raúl García Pierna|ESP|MOV|2:52:32
35|Mauro Schmid|SUI|JAY|2:53:29
36|Kévin Vauquelin|FRA|INE|3:01:17
37|Antonio Tiberi|ITA|BAH|3:03:52
38|Sergio Higuita|COL|XDS|3:04:35
39|Quinten Hermans|BEL|PIN|3:05:23
40|Clément Braz Afonso|FRA|GFU|3:06:23
41|Lennert Van Eetvelt|BEL|LOT|3:08:22
42|Aurélien Paret-Peintre|FRA|DEC|3:08:28
43|Tobias Foss|NOR|INE|3:08:29
44|Valentin Paret-Peintre|FRA|SOQ|3:09:21
45|Ion Izagirre|ESP|COF|3:10:13
46|Alex Baudin|FRA|EFE|3:11:41
47|Abel Balderstone|ESP|CRS|3:24:26
48|Marc Hirschi|SUI|TUD|3:29:59
49|Mathias Vacek|CZE|LTK|3:34:36
50|Nicolas Breuillard|FRA|TEN|3:34:36
51|Joris Delbove|FRA|TEN|3:37:06
52|Michael Matthews|AUS|JAY|3:37:35
53|Michael Valgren|DEN|EFE|3:39:09
54|Javier Romo|ESP|MOV|3:41:49
55|Damiano Caruso|ITA|BAH|3:46:43
56|Xandro Meurisse|BEL|PIN|3:49:13
57|Romain Grégoire|FRA|GFU|3:50:00
58|Quentin Pacher|FRA|GFU|3:50:29
59|Ben Healy|IRL|EFE|3:51:03
60|Anders Skaarseth|NOR|UNO|4:03:07
61|Alexandre Delettre|FRA|TEN|4:03:16
62|Bruno Armirail|FRA|VIS|4:03:26
63|Michael Storer|AUS|TUD|4:11:37
64|Anders Halland Johannessen|NOR|UNO|4:14:42
65|Nelson Oliveira|POR|MOV|4:17:56
66|Vlad Van Mechelen|BEL|BAH|4:18:07
67|Louis Vervaeke|BEL|SOQ|4:18:38
68|George Bennett|NZL|NSN|4:18:42
69|Clément Russo|FRA|GFU|4:20:25
70|Felix Engelhardt|GER|JAY|4:22:31
71|Jasper Stuyven|BEL|SOQ|4:22:49
72|Nils Politt|GER|UAE|4:23:30
73|Rick Pluimers|NED|TUD|4:24:31
74|Tim Wellens|BEL|UAE|4:25:28
75|Mathieu van der Poel|NED|ALP|4:26:28
76|Mathis Le Berre|FRA|TEN|4:26:49
77|Jonas Abrahamsen|NOR|UNO|4:30:23
78|Marco Frigo|ITA|NSN|4:32:04
79|Ewen Costiou|FRA|GFU|4:32:23
80|Mads Pedersen|DEN|LTK|4:33:05
81|Brent Van Moer|BEL|PIN|4:33:14
82|Victor Campenaerts|BEL|VIS|4:34:17
83|Jan Tratnik|SLO|RBH|4:34:24
84|Kasper Asgreen|DEN|EFE|4:35:37
85|Alex Aranburu|ESP|COF|4:37:55
86|Mattéo Vercher|FRA|TEN|4:38:44
87|Warren Barguil|FRA|PIC|4:40:03
88|Damien Howson|AUS|PIN|4:41:38
89|Sebastian Berwick|AUS|CRS|4:44:04
90|Georg Zimmermann|GER|LOT|4:44:21
91|Luke Plapp|AUS|JAY|4:44:30
92|Matej Mohorič|SLO|BAH|4:44:30
93|Lorenzo Germani|ITA|GFU|4:48:18
94|Toms Skujiņš|LAT|LTK|4:49:39
95|Nico Denz|GER|RBH|4:52:16
96|Emiel Verstrynge|BEL|ALP|4:57:11
97|Magnus Cort|DEN|UNO|4:57:57
98|Nicolas Vinokurov|KAZ|XDS|5:01:12
99|Xabier Azparren|ESP|PIN|5:02:54
100|Simone Velasco|ITA|XDS|5:04:15
101|Jefferson Alveiro Cepeda|ECU|MOV|5:04:42
102|Frank van den Broek|NED|PIC|5:07:36
103|Per Strand Hagenes|NOR|VIS|5:07:45
104|Michel Hessmann|GER|MOV|5:11:28
105|Robert Stannard|AUS|BAH|5:13:12
106|Max Walker|GBR|EFE|5:13:19
107|Luke Durbridge|AUS|JAY|5:13:26
108|Anthony Turgis|FRA|TEN|5:14:55
109|Thibault Guernalec|FRA|TEN|5:15:27
110|Michał Kwiatkowski|POL|INE|5:15:39
111|Tim van Dijke|NED|RBH|5:16:43
112|Jakub Otruba|CZE|CRS|5:17:23
113|Georg Steinhauser|GER|EFE|5:19:39
114|Edward Planckaert|BEL|ALP|5:24:18
115|Jonas Rickaert|BEL|ALP|5:24:39
116|Florian Vermeersch|BEL|UAE|5:26:49
117|Benjamin Thomas|FRA|COF|5:27:05
118|Robbe Dhondt|BEL|PIC|5:27:16
119|Hugo Page|FRA|COF|5:27:56
120|Josh Tarling|GBR|INE|5:28:28
121|Aaron Gate|NZL|XDS|5:28:56
122|Alex Kirsch|LUX|COF|5:30:05
123|Filippo Ganna|ITA|INE|5:31:00
124|Mike Teunissen|NED|XDS|5:31:58
125|Julian Alaphilippe|FRA|TUD|5:33:07
126|Stefano Oldani|ITA|CRS|5:33:34
127|Fred Wright|GBR|PIN|5:36:21
128|Liam Slock|BEL|LOT|5:36:40
129|Joel Nicolau|ESP|CRS|5:37:07
130|Daan Hoole|NED|DEC|5:38:04
131|Dylan van Baarle|NED|SOQ|5:38:53
132|Huub Artz|NED|LOT|5:42:34
133|Tim Marsman|NED|ALP|5:43:11
134|Krists Neilands|LAT|NSN|5:43:58
135|Jasper Philipsen|BEL|ALP|5:44:35
136|Dorian Godon|FRA|INE|5:46:54
137|Silvan Dillier|SUI|ALP|5:48:36
138|Søren Wærenskjold|NOR|UNO|5:48:38
139|Niklas Märkl|GER|PIC|5:51:31
140|Pavel Bittner|CZE|PIC|5:51:51
141|Biniam Girmay|ERI|NSN|5:54:20
142|Max Kanter|GER|XDS|5:55:29
143|Pascal Eenkhoorn|NED|SOQ|5:57:18
144|Jenthe Biermans|BEL|COF|6:01:44
145|John Degenkolb|GER|PIC|6:01:44
146|Baptiste Veistroffer|FRA|LOT|6:02:14
147|Marco Haller|AUT|TUD|6:02:20
148|Milan Fretin|BEL|COF|6:06:10
149|Olav Kooij|NED|DEC|6:09:18
150|Jake Stewart|GBR|NSN|6:10:47
151|Lewis Askey|GBR|NSN|6:10:48
152|Davide Ballerini|ITA|XDS|6:11:22
153|Piet Allegaert|BEL|COF|6:12:22
154|Phil Bauhaus|GER|BAH|6:13:49
155|Kamil Gradek|POL|BAH|6:16:12
156|Julius van den Berg|NED|PIC|6:17:26
157|Matis Louvel|FRA|NSN|6:17:36
158|Cees Bol|NED|DEC|6:22:08
"""

# Coureurs ayant abandonné (équipe / nationalité / étape et raison)
ABANDONS = [
    # nom, nat, équipe, étape d'abandon, raison
    ("Torstein Træen", "NOR", "UNO", 6, "Chute dans la descente du Tourmalet (commotion, côtes fracturées)"),
    ("Tim Merlier", "BEL", "SOQ", 15, "Abandon sur terrain montagneux"),
    ("Jonas Vingegaard", "DEN", "VIS", 15, "Chute, fracture de la clavicule"),
    ("Florian Lipowitz", "GER", "RBH", 16, "Chute dans la descente du contre-la-montre, fracture de la clavicule"),
    ("Brandon McNulty", "USA", "UAE", 18, "Maladie (touchant l'équipe UAE)"),
]

# --------------------------------------------------------------------------
# Construction des collections
# --------------------------------------------------------------------------
teams = [
    {"id": TEAM_ID[k], "code": k, "name": v[0], "category": v[1]}
    for k, v in TEAMS.items()
]

riders = []
gc = []
for line in GC_RAW.strip().splitlines():
    rank, name, nat, team, t = line.split("|")
    rank = int(rank)
    rid = slugify(name)
    riders.append({
        "id": rid, "name": name, "nationality": nat,
        "teamId": TEAM_ID[team], "status": "finished", "finalRank": rank,
    })
    if rank == 1:
        total = to_seconds(t)
        gc.append({"id": rank, "rank": rank, "riderId": rid, "teamId": TEAM_ID[team],
                   "time": t, "totalSeconds": total, "gapSeconds": 0})
    else:
        gap = to_seconds(t)
        gc.append({"id": rank, "rank": rank, "riderId": rid, "teamId": TEAM_ID[team],
                   "time": None, "totalSeconds": total + gap, "gapSeconds": gap,
                   "gap": t})
# temps formaté pour tous
for e in gc:
    s = e["totalSeconds"]
    e["time"] = f"{s // 3600}:{(s % 3600) // 60:02d}:{s % 60:02d}"

for name, nat, team, stage, why in ABANDONS:
    riders.append({
        "id": slugify(name), "name": name, "nationality": nat,
        "teamId": TEAM_ID[team], "status": "abandoned", "finalRank": None,
        "abandonedOnStage": stage, "abandonReason": why,
    })

R = {r["name"]: r["id"] for r in riders}  # nom -> id


def rid(name):
    return R[name]


def classification(rows, value_key, with_gap=False):
    out = []
    for i, row in enumerate(rows, start=1):
        name, val = row
        r = next(x for x in riders if x["id"] == rid(name))
        e = {"id": i, "rank": i, "riderId": r["id"], "teamId": r["teamId"], value_key: val}
        out.append(e)
    return out


points = classification([
    ("Mads Pedersen", 559), ("Jasper Philipsen", 475), ("Biniam Girmay", 367),
    ("Max Kanter", 289), ("Olav Kooij", 246), ("Tadej Pogačar", 198),
    ("Søren Wærenskjold", 159), ("Remco Evenepoel", 157), ("Isaac del Toro", 143),
    ("Anthony Turgis", 139),
], "points")

mountains = classification([
    ("Richard Carapaz", 156), ("Tadej Pogačar", 100), ("Valentin Paret-Peintre", 99),
    ("Sepp Kuss", 55), ("Remco Evenepoel", 50), ("Lenny Martinez", 41),
    ("Isaac del Toro", 40), ("Paul Seixas", 36), ("Tobias Halland Johannessen", 29),
    ("Jai Hindley", 28),
], "points")

youth_raw = [
    ("Isaac del Toro", "74:06:08"), ("Paul Seixas", "2:14"), ("Lenny Martinez", "3:20"),
    ("Juan Ayuso", "8:06"), ("Davide Piganzoli", "54:01"), ("Quinn Simmons", "1:25:46"),
    ("Matthew Riccitello", "2:01:27"), ("Pablo Castrillo", "2:22:01"),
    ("Raúl García Pierna", "2:42:50"), ("Kévin Vauquelin", "2:51:35"),
]
youth = []
for i, (name, t) in enumerate(youth_raw, start=1):
    r = next(x for x in riders if x["id"] == rid(name))
    e = {"id": i, "rank": i, "riderId": r["id"], "teamId": r["teamId"]}
    if i == 1:
        e["totalSeconds"] = to_seconds(t)
        e["gapSeconds"] = 0
        e["time"] = t
    else:
        e["gapSeconds"] = to_seconds(t)
        e["gap"] = t
    youth.append(e)

team_class_raw = [
    ("lidl-trek", "224:57:43"), ("uae-team-emirates-xrg", "36:57"),
    ("red-bull-bora-hansgrohe", "1:06:22"), ("decathlon-cma-cgm", "1:47:44"),
    ("visma-lease-a-bike", "2:18:03"), ("ef-education-easypost", "3:38:20"),
    ("netcompany-ineos", "4:49:54"), ("team-bahrain-victorious", "5:38:20"),
    ("team-totalenergies", "5:48:37"), ("pinarello-q36-5-pro-cycling-team", "5:49:14"),
]
team_classification = []
for i, (tid, t) in enumerate(team_class_raw, start=1):
    assert tid in {x["id"] for x in teams}, tid
    e = {"id": i, "rank": i, "teamId": tid}
    if i == 1:
        e.update(time=t, gapSeconds=0, totalSeconds=to_seconds(t))
    else:
        e.update(gap=t, gapSeconds=to_seconds(t))
    team_classification.append(e)

# --------------------------------------------------------------------------
# Étapes
# --------------------------------------------------------------------------
TTT, HIL, MTN, FLT, ITT = ("team-time-trial", "hilly", "mountain", "flat",
                           "individual-time-trial")

STAGES_RAW = [
    # n, date, départ, arrivée, km, type, vainqueur (nom coureur) ou None
    (1, "2026-07-04", "Barcelone", "Barcelone (Montjuïc)", 19.6, TTT, None),
    (2, "2026-07-05", "Tarragone", "Barcelone", 168.5, HIL, "Isaac del Toro"),
    (3, "2026-07-06", "Granollers", "Les Angles", 195.9, MTN, "Tadej Pogačar"),
    (4, "2026-07-07", "Carcassonne", "Foix", 181.9, HIL, "Mads Pedersen"),
    (5, "2026-07-08", "Lannemezan", "Pau", 158.3, FLT, "Olav Kooij"),
    (6, "2026-07-09", "Pau", "Gavarnie-Gèdre", 186.2, MTN, "Tadej Pogačar"),
    (7, "2026-07-10", "Hagetmau", "Bordeaux", 175.1, FLT, "Tim Merlier"),
    (8, "2026-07-11", "Périgueux", "Bergerac", 180.4, FLT, "Tim Merlier"),
    (9, "2026-07-12", "Malemort", "Ussel", 154.6, HIL, "Mathieu van der Poel"),
    (10, "2026-07-14", "Aurillac", "Le Lioran", 166.6, MTN, "Tadej Pogačar"),
    (11, "2026-07-15", "Vichy", "Nevers", 161.3, FLT, "Søren Wærenskjold"),
    (12, "2026-07-16", "Magny-Cours", "Chalon-sur-Saône", 179.1, FLT, "Tim Merlier"),
    (13, "2026-07-17", "Dole", "Belfort", 205.8, HIL, "Mauro Schmid"),
    (14, "2026-07-18", "Mulhouse", "Le Markstein", 155.3, MTN, "Tadej Pogačar"),
    (15, "2026-07-19", "Champagnole", "Plateau de Solaison", 183.9, MTN, "Remco Evenepoel"),
    (16, "2026-07-21", "Évian-les-Bains", "Thonon-les-Bains", 26.1, ITT, "Remco Evenepoel"),
    (17, "2026-07-22", "Chambéry", "Voiron", 174.7, FLT, "Jasper Philipsen"),
    (18, "2026-07-23", "Voiron", "Orcières-Merlette", 185.2, MTN, "Richard Carapaz"),
    (19, "2026-07-24", "Gap", "Alpe d'Huez", 127.9, MTN, "Tadej Pogačar"),
    (20, "2026-07-25", "Le Bourg-d'Oisans", "Alpe d'Huez", 170.9, MTN, "Richard Carapaz"),
    (21, "2026-07-26", "Paris", "Paris (Champs-Élysées)", 88.7, FLT, "Mathieu van der Poel"),
]

# Maillot jaune à l'issue de l'étape (connu avec certitude)
YELLOW = {1: "Jonas Vingegaard", 2: "Isaac del Toro", 3: "Tadej Pogačar",
          4: "Torstein Træen", 5: "Torstein Træen"}
for n in range(6, 22):
    YELLOW[n] = "Tadej Pogačar"

# Podiums partiels (positions connues uniquement)
TOP = {
    2: [("Isaac del Toro", 1), ("Tadej Pogačar", 2), ("Remco Evenepoel", 3)],
    3: [("Tadej Pogačar", 1), ("Jonas Vingegaard", 2)],
    5: [("Olav Kooij", 1), ("Max Kanter", 2), ("Tim Merlier", 3)],
    6: [("Tadej Pogačar", 1), ("Jonas Vingegaard", 2)],
    11: [("Søren Wærenskjold", 1), ("Olav Kooij", 2), ("Jasper Philipsen", 3)],
    13: [("Mauro Schmid", 1), ("Harold Tejada", 2)],
    15: [("Remco Evenepoel", 1), ("Tadej Pogačar", 2)],
    16: [("Remco Evenepoel", 1), ("Tadej Pogačar", 2), ("Mattias Skjelmose", 3)],
    21: [("Mathieu van der Poel", 1), ("Jasper Philipsen", 2), ("Mads Pedersen", 3)],
}

NOTES = {
    1: "Contre-la-montre par équipes (première fois en ouverture depuis 1971). Visma–Lease a Bike gagne, Vingegaard prend le jaune. INEOS à 8 s, UAE à 12 s.",
    2: "Pogačar lance le sprint pour son équipier del Toro, qui gagne et prend le jaune.",
    3: "Attaque de Pogačar dans la dernière montée vers Les Angles, qui reprend le jaune. Étape sans public à cause des incendies.",
    4: "Chaleur d'environ 40 °C. Le jaune passe à Torstein Træen, membre de l'échappée.",
    5: "Sprint massif à Pau.",
    6: "Première étape de haute montagne, Tourmalet. Raid solitaire de Pogačar, victoire avec 2 min 38 s d'avance sur Vingegaard. Træen abandonne.",
    9: "Étape raccourcie de 185,5 à 154.6 km (alerte canicule rouge en Corrèze). Victoire de van der Poel en échappée.",
    10: "Attaque de Pogačar dans le col du Pertus, 3e victoire d'étape.",
    11: "Moyenne record de l'histoire du Tour : 50,91 km/h.",
    13: "Victoire de Schmid en échappée, Pidcock dans l'échappée.",
    14: "Pogačar attaque à environ 7 km de l'arrivée dans les Vosges.",
    15: "Vingegaard chute et abandonne (clavicule). Premier succès d'Evenepoel en montagne sur le Tour.",
    16: "Contre-la-montre : Evenepoel devant Pogačar (+28 s). Lipowitz chute et abandonne.",
    17: "Philipsen s'impose, la lutte pour le maillot vert se resserre.",
    18: "Carapaz seul dans le final, prend la tête du classement de la montagne.",
    19: "Pogačar bat le record de montée de l'Alpe d'Huez de Pantani (1995).",
    20: "Étape reine (4 cols dont 3 hors catégorie). Carapaz s'impose ; Pogačar travaille pour del Toro.",
    21: "Étape raccourcie de 132,5 à 88.7 km (incendies en Gironde). Classement général neutralisé après le premier tour de Montmartre. Van der Poel gagne à la photo-finish.",
}

SHORTENED = {9: 185.5, 21: 132.5}
SPECIAL_TIMES = {11: "3:10:06", 21: "1:58:49"}  # temps du vainqueur (sources presse)

# Correction typographique : notes avec virgule décimale uniforme
NOTES[9] = NOTES[9].replace("154.6", "154,6")
NOTES[21] = NOTES[21].replace("88.7", "88,7")

stages = []
for n, date, start, finish, km, typ, winner in STAGES_RAW:
    s = {
        "id": n, "number": n, "date": date, "start": start, "finish": finish,
        "distanceKm": km, "type": typ,
        "winnerRiderId": rid(winner) if winner else None,
        "winnerTeamId": TEAM_ID["VIS"] if n == 1 else None,
        "yellowJerseyRiderId": rid(YELLOW[n]),
        "topFinishers": [{"position": p, "riderId": rid(nm)} for nm, p in TOP.get(n, [])],
        "notes": NOTES.get(n, ""),
    }
    if n in SHORTENED:
        s["originalDistanceKm"] = SHORTENED[n]
    if n in SPECIAL_TIMES:
        s["winningTime"] = SPECIAL_TIMES[n]
    if n == 11:
        s["averageSpeedKmh"] = 50.91
    stages.append(s)

# --------------------------------------------------------------------------
# Avance du leader sur le 2e au classement général (points vérifiés)
# --------------------------------------------------------------------------
gc_lead = [
    {"id": 1, "afterStage": 6, "leaderId": rid("Tadej Pogačar"), "secondId": rid("Jonas Vingegaard"), "leadSeconds": 162},
    {"id": 2, "afterStage": 11, "leaderId": rid("Tadej Pogačar"), "secondId": rid("Jonas Vingegaard"), "leadSeconds": 216},
    {"id": 3, "afterStage": 12, "leaderId": rid("Tadej Pogačar"), "secondId": rid("Jonas Vingegaard"), "leadSeconds": 216},
    {"id": 4, "afterStage": 18, "leaderId": rid("Tadej Pogačar"), "secondId": rid("Remco Evenepoel"), "leadSeconds": 272},
    {"id": 5, "afterStage": 21, "leaderId": rid("Tadej Pogačar"), "secondId": rid("Remco Evenepoel"), "leadSeconds": 386},
]

meta = {
    "id": 1,
    "name": "Tour de France 2026",
    "edition": 113,
    "startDate": "2026-07-04",
    "endDate": "2026-07-26",
    "grandDepart": "Barcelone (Espagne)",
    "finish": "Paris (Champs-Élysées)",
    "totalDistanceKm": 3245,
    "restDays": [
        {"date": "2026-07-13", "place": "Cantal"},
        {"date": "2026-07-20", "place": "Haute-Savoie"},
    ],
    "startersCount": 184,
    "finishersCount": 158,
    "winnerRiderId": rid("Tadej Pogačar"),
    "winningTime": "73:56:26",
    "averageSpeedKmh": 43.227,
    "jerseys": {
        "yellow": rid("Tadej Pogačar"), "green": rid("Mads Pedersen"),
        "polkaDot": rid("Richard Carapaz"), "white": rid("Isaac del Toro"),
        "combativity": rid("Richard Carapaz"), "team": TEAM_ID["LTK"],
    },
    "sources": [
        "https://en.wikipedia.org/wiki/2026_Tour_de_France",
        "https://www.oasport.it/2026/07/tour-de-france-2026-tutte-le-classifiche-dominio-assoluto-di-pogacar-maglia-verde-a-pedersen/",
        "https://cyclinguptodate.com/cycling/tour-de-france-2026-final-classifications-pogacar-pedersen-carapaz-and-del-toro-seal-victory-in-paris",
    ],
    "dataNotes": [
        "Données figées après la course (juillet 2026), pour usage pédagogique/portfolio.",
        "Seuls les 158 arrivants et 5 abandons connus figurent dans 'riders' (26 abandons au total).",
        "'stages[].topFinishers' ne contient que les positions vérifiées ; pour les résultats complets, voir ProCyclingStats/FirstCycling.",
        "Les classements par points incluent les points de l'étape 21 (Wikipedia) ; certains sites affichent des totaux plus bas, publiés avant la dernière étape.",
        "Pidcock (9e, +29:28, Pinarello–Q36.5) et Jegat (10e, +33:21, TotalEnergies) : certains tableaux tiers mélangent noms et équipes. Wikipedia a été retenue.",
        "'gcLead' ne contient que les points d'avance vérifiés, pas le classement complet à chaque étape.",
    ],
}

db = {
    "meta": meta,
    "teams": teams,
    "riders": riders,
    "stages": stages,
    "gc": gc,
    "points": points,
    "mountains": mountains,
    "youth": youth,
    "teamClassification": team_classification,
    "gcLead": gc_lead,
}

# --------------------------------------------------------------------------
# Validation d'intégrité
# --------------------------------------------------------------------------
rider_ids = {r["id"] for r in riders}
team_ids = {t["id"] for t in teams}
assert len(rider_ids) == len(riders), "ids de coureurs en double"
assert len(teams) == 23
assert len(gc) == 158 and [e["rank"] for e in gc] == list(range(1, 159))
for r in riders:
    assert r["teamId"] in team_ids, r
for coll in (gc, points, mountains, youth):
    for e in coll:
        assert e["riderId"] in rider_ids, e
for s in stages:
    assert s["yellowJerseyRiderId"] in rider_ids
    if s["winnerRiderId"]:
        assert s["winnerRiderId"] in rider_ids
    for t in s["topFinishers"]:
        assert t["riderId"] in rider_ids
# La source annonce 3 245 km au total ; la somme des étapes arrondies donne 3 246,0 km.
assert abs(sum(s["distanceKm"] for s in stages) - 3245) <= 2, sum(s["distanceKm"] for s in stages)

out = Path(__file__).resolve().parent.parent / "src" / "mocks" / "data" / "db.json"
out.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"OK -> {out} | coureurs={len(riders)} équipes={len(teams)} étapes={len(stages)} "
      f"distance={round(sum(s['distanceKm'] for s in stages), 1)} km")
