# Generar los logos de marcas

```bash
export LOGOS_TMP=/tmp/palanca-logos && mkdir -p $LOGOS_TMP/si/pkg $LOGOS_TMP/sets && cd $LOGOS_TMP
npm pack simple-icons@16.36.0 && tar xzf simple-icons-16.36.0.tgz -C si/pkg
cd sets && for p in @iconify-json/simple-icons @iconify-json/logos @iconify-json/streamline-logos; do f=$(npm pack $p --silent); mkdir -p x-$f && tar xzf $f -C x-$f; done; cd -
python3 scripts/logos/generar.py     # hoja de prueba: $LOGOS_TMP/logos.html + logos.json
python3 scripts/logos/a_app.py       # escribe src/lib/logosMarcas.js
```
Detalle y estado en `docs/LOGOS.md`.
