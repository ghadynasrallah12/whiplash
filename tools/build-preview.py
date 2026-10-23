#!/usr/bin/env python3
"""Bundle index.html + css + bundled js into preview/preview.html (hosted Claude preview)."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root/"index.html").read_text(); css = (root/"css/style.css").read_text()
logo = (root/"js/logo3d.js").read_text(); main = (root/"js/main.js").read_text()
wdata = (root/"js/works-data.js").read_text(); works = (root/"js/works.js").read_text(); scr = (root/"js/scramble.js").read_text(); gl = (root/"js/gl-media.js").read_text()
body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
body = body.replace('<script src="js/logo3d.js" defer></script>', '<script>\n'+logo+'\n</script>')
body = body.replace('<script src="js/scramble.js" defer></script>', '<script>\n'+scr+'\n</script>')
body = body.replace('<script src="js/works-data.js" defer></script>', '<script>\n'+wdata+'\n</script>')
body = body.replace('<script src="js/gl-media.js" defer></script>', '<script>\n'+gl+'\n</script>')
body = body.replace('<script src="js/works.js" defer></script>', '<script>\n'+works+'\n</script>')
body = body.replace('<script src="js/main.js" defer></script>', '<script>\n'+main+'\n</script>')
body = '<div data-page="home" id="app">' + body + '</div>'  # body attribute → wrapper (the preview page has no body tag of its own)
out = f'<title>Whiplash</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n:root {{ color-scheme: dark; }}\n{css}\n</style>\n{body}'
(root/"preview").mkdir(exist_ok=True); (root/"preview/preview.html").write_text(out)
print("wrote preview/preview.html", len(out), "bytes")
