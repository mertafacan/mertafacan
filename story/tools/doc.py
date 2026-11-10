import json
from pathlib import Path
R = Path(__file__).resolve().parent.parent
w = json.load(open(R / 'data/words.json')); meta = json.load(open(R / 'data/meta.json')); sc = json.load(open(R / 'script.json'))
tot = sum(len(l['words']) for l in w['lines'])
o = []
o.append(f"# {sc['title']}\n")
o.append(f"True story: **George de Hevesy and the Nobel medals** (Copenhagen, 1940). Voice: Kokoro (free, CPU), voice `{sc['voice']['voice']}`. "
         f"**{tot} words, {w['duration']:.1f} s voice, {meta['duration']:.1f} s video, 1080x1920, 30 fps.**\n")
o.append("> The quoted joke in line 3 is a dramatisation. Facts: Hevesy dissolved the Laue and Franck gold medals in aqua regia, left the beaker on a lab shelf while soldiers searched the institute, and recovered the gold after the war so the medals could be recast.\n")
o.append("## Script (words and seconds per line)\n\n| # | beat | time | secs | words | text |\n|---|------|------|------|-------|------|")
for l in w['lines']:
    o.append(f"| {l['id']} | {l['beat']} | {l['start']:.1f}-{l['end']:.1f} | {l['end']-l['start']:.1f} | {len(l['words'])} | {l['text']} |")
o.append("\n## Beat list (every start is a word time from faster-whisper)\n\n| t (s) | shot | place | what the viewer sees |\n|---|---|---|---|")
desc = {'hook': 'George smug at the bench, two gold medals drop into the acid jar', 'street_sign': 'sign in the world: KØBENHAVN 9 APRIL 1940', 'street_wide': 'Institute for Theoretical Physics, soldiers marching in',
 'tray': 'insert on the gold medals on their tray (NOBEL PRIZE GOLD), pull back to a worried George', 'acid': 'George grabs the jar and the AQUA REGIA bottle', 'friend': 'the friend sees it and laughs',
 'mocker_closeup': 'BIG close-up of the mocker: "you are making soup out of gold"', 'beaker_insert': 'insert: medals sink, bubbles, liquid turns orange', 'beaker_reveal': 'George arms up, orange water',
 'shelf_wide': 'George carries the jar to the shelf of look-alike jars', 'label_insert': 'insert on the jar label HAuCl4, George shrugs', 'soldiers_enter': 'door opens, soldiers come in',
 'search_drawers': 'close-up: soldier searches the drawers', 'search_table': 'soldier looks under the table', 'junk_george': 'YOU SEE: George points at the junk drawer in your kitchen', 'junk_macro': 'insert: the junk drawer, everything looks like junk',
 'shelf_all_junk': 'the shelf, the jar hides among the junk', 'past_jar': 'soldiers walk right past the jar', 'never_touched': 'insert on the untouched jar', 'calendar': 'calendar flips 1940 -> 1945 (war over)',
 'gold_back': 'orange water turns back into gold sparkles', 'medals_again': 'the medals are made again on the tray', 'callback': 'callback to the hook framing', 'reveal': 'BIGGEST FRAME: the medals fly at the lens'}
for s in meta['shots']: o.append(f"| {s['t0']:.1f} | {s['name']} | {s['set']} | {desc.get(s['name'], '')} |")
o.append("\n## Upload\n\n- **Title:** The Nobel Medals That Were Dissolved on Purpose\n- **Cover:** `out/cover_*.jpg` (clean frame of the payoff, no text)\n- **Description:** A scientist dissolved two gold Nobel medals in acid and left the jar on a shelf. Everyone laughed. Then the soldiers came.\n- **Tags:** #shorts #truestory #history #science #plottwist\n")
(R / 'SCRIPT.md').write_text('\n'.join(o), encoding='utf8'); print('SCRIPT.md written', tot, 'words')
