#!/usr/bin/env python3
"""
Render the lyric vocal for "Expense It, Don't Stress It" with the macOS speech engine (no paid
APIs, no downloads). Two passes per line: measure the natural duration, then re-render at the
speaking rate that makes the line fill its two bars — that is what turns speech into a rap
cadence when the browser drops each line on the downbeat. The browser then pitch-shifts the
chorus lines onto a melody (see lib/vocalPerformer.ts) so the hook is sung.
Usage: python3 scripts/render-vocals.py   → public/vocals/*.wav + manifest.json
"""
import json, subprocess, wave, re, os
VOICE = os.environ.get("BANGER_VOICE", "Samantha")
LINE_SECONDS = 2.4   # one bar at 100 BPM
TARGET = 2.05        # land inside the bar with a breath
CHORUS = ["Expense it, don't stress it, drop it in the app","Seven days, snap the receipt, that's a wrap","Spendly's got you covered, no more inbox chase","Expense it, don't stress it, put it in its place"]
LINES = ["Friday on the dock and the coffee's on me","Fuel at the pump, got a crew of three","Used to hold the paper till the end of the month","Now I open Spendly and I'm done with the hunt",*CHORUS,
 "Dispatch on the line, Dana's got a plan","Photo of the receipt right there in her hand","One week window so the money comes back","Warehouse to the road, everybody on track",*CHORUS,
 "No more digging through the truck for the slip","Tap, snap, submit, that's the whole trip",*CHORUS,"Expense it, don't stress it","Expense it, don't stress it"]
out = "public/vocals"; os.makedirs(out, exist_ok=True)
def render(text, rate, path):
    subprocess.run(["say","-v",VOICE,"-r",str(rate),"-o",path,"--file-format=WAVE","--data-format=LEI16@22050",text],check=True)
    with wave.open(path) as w: return w.getnframes()/w.getframerate()
manifest=[]
seen={}
for i,text in enumerate(LINES):
    key=text
    if key in seen:
        manifest.append({"index":i,"text":text,"file":seen[key]["file"],"seconds":seen[key]["seconds"]}); continue
    f=f"{out}/line-{i:02d}.wav"
    d=render(text,175,f)
    target = TARGET if i < len(LINES)-1 else 2.0
    rate=max(150,min(400,int(175*d/target)))
    d=render(text,rate,f)
    entry={"index":i,"text":text,"file":f"/vocals/line-{i:02d}.wav","seconds":round(d,3),"rate":rate}
    seen[key]=entry; manifest.append(entry)
    print(f"{i:02d} {rate:3d}wpm {d:4.2f}s  {text}")
json.dump({"voice":VOICE,"lines":manifest},open(f"{out}/manifest.json","w"),indent=1)
