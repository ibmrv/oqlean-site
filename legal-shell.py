# Builds /privacy/ and /terms/ pages from RU+UZ markdown-ish blocks. Run: python3 legal-shell.py
import html, re, pathlib
UPDATED = "1 ноября 2026"
UPDATED_UZ = "2026-yil 1-noyabr"
CSS = """
:root{--bg:#F3F6F5;--surface:#FFFFFF;--ink:#101615;--muted:#55625F;--line:#DCE4E1;--mint-ink:#0C6B5C;--mint:#BFEDE2}
@media (prefers-color-scheme:dark){:root{--bg:#0D1211;--surface:#151C1B;--ink:#EAF1EF;--muted:#9AAAA6;--line:#26302E;--mint-ink:#8FE0CF;--mint:#1E4A42;color-scheme:dark}}
*{box-sizing:border-box}html{padding-top:env(safe-area-inset-top,0px)}
body{margin:0;background:var(--bg);color:var(--ink);font:500 16px/1.6 "Manrope",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:760px;margin-inline:auto;padding:24px max(16px,env(safe-area-inset-right,0px)) 64px max(16px,env(safe-area-inset-left,0px))}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:28px}
.logo{font-family:"Unbounded","Manrope",sans-serif;font-weight:700;font-size:20px;text-decoration:none;color:var(--ink);letter-spacing:-.02em}
.lang{display:flex;border:1px solid var(--line);border-radius:999px;padding:3px}
.lang button{border:0;background:none;padding:6px 11px;border-radius:999px;font:700 13px/1 inherit;cursor:pointer;color:var(--muted)}
.lang button[aria-pressed="true"]{background:var(--ink);color:var(--bg)}
h1{font-family:"Unbounded","Manrope",sans-serif;font-weight:600;font-size:clamp(26px,5vw,36px);line-height:1.1;letter-spacing:-.02em;margin:0 0 8px;text-wrap:balance}
h2{font-size:19px;margin:30px 0 8px;letter-spacing:-.01em}
p,li{color:var(--ink)}ul{padding-left:20px}li{margin:4px 0}
.upd{color:var(--muted);font-size:14px;margin:0 0 20px}
.box{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;font-size:15px}
a{color:var(--mint-ink)}
footer{margin-top:40px;padding-top:18px;border-top:1px solid var(--line);font-size:14px;color:var(--muted);display:flex;flex-wrap:wrap;gap:8px 18px}
[hidden]{display:none!important}
"""
def md(t):
    out=[];ul=False
    for line in t.strip().split("\n"):
        line=line.rstrip()
        if not line:
            if ul: out.append("</ul>");ul=False
            continue
        esc=html.escape(line)
        esc=re.sub(r"\*\*(.+?)\*\*",r"<b>\1</b>",esc)
        esc=re.sub(r"\[(.+?)\]\((.+?)\)",r'<a href="\2">\1</a>',esc)
        if line.startswith("## "): 
            if ul: out.append("</ul>");ul=False
            out.append("<h2>"+esc[3:]+"</h2>")
        elif line.startswith("- "):
            if not ul: out.append("<ul>");ul=True
            out.append("<li>"+esc[2:]+"</li>")
        elif line.startswith("> "):
            out.append('<p class="box">'+esc[5:]+"</p>")
        else:
            if ul: out.append("</ul>");ul=False
            out.append("<p>"+esc+"</p>")
    if ul: out.append("</ul>")
    return "\n".join(out)
def page(slug,title_ru,title_uz,ru,uz):
    doc=f"""<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title_ru} — OQlean</title><meta name="description" content="{title_ru} клининговой службы OQlean, Ташкент.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700&family=Manrope:wght@500;700&display=swap">
<style>{CSS}</style></head><body><div class="wrap">
<header><a class="logo" href="/">OQlean</a><div class="lang" role="group" aria-label="Язык / Til"><button type="button" data-l="ru" aria-pressed="true">RU</button><button type="button" data-l="uz" aria-pressed="false">UZ</button></div></header>
<article data-lang="ru"><h1>{title_ru}</h1><p class="upd">Редакция от {UPDATED}</p>{md(ru)}</article>
<article data-lang="uz" hidden><h1>{title_uz}</h1><p class="upd">{UPDATED_UZ} tahriri</p>{md(uz)}</article>
<footer><a href="/">oqlean.uz</a><a href="/privacy/">Политика конфиденциальности · Maxfiylik siyosati</a><a href="/terms/">Условия · Shartlar</a></footer>
</div><script>
function setL(l){{document.documentElement.lang=l;document.querySelectorAll("article").forEach(a=>a.hidden=a.dataset.lang!==l);document.querySelectorAll(".lang button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.l===l));try{{localStorage.setItem("oq2_lang",l)}}catch(e){{}}}}
document.querySelector(".lang").onclick=e=>{{const b=e.target.closest("button");if(b)setL(b.dataset.l)}};
try{{const l=localStorage.getItem("oq2_lang");if(l==="uz")setL("uz")}}catch(e){{}}
</script></body></html>"""
    pathlib.Path(slug).mkdir(exist_ok=True)
    pathlib.Path(slug+"/index.html").write_text(doc)
exec(open("legal-text.py").read())
