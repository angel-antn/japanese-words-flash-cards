---
name: add-level
description: Añadir o actualizar un nivel JLPT (N5, N4, N3…) de Japan Flashcards — sube el gist de palabras del nivel y lo registra/activa en el gist manifiesto, sin tocar código ni redeploy. Úsalo cuando el usuario quiera "añadir/activar un nivel", "subir las palabras de N4", "actualizar las palabras de N5" o "registrar un nivel nuevo".
allowed-tools: Bash, Read, Edit, Write
---

# Añadir o actualizar un nivel (Japan Flashcards)

La app carga datos **en vivo desde gists**: un gist *manifiesto* lista los niveles y cada nivel apunta a un gist con todas sus palabras (cada palabra lleva `category`, que la app usa para los chips de filtro). Un nivel con `url: ""` se muestra como "Próximamente" deshabilitado.

## Prerrequisitos

1. Ejecutar desde la raíz del proyecto.
2. `gh auth status` con scope `gist`. Si falta: `! gh auth login -s gist` y parar.
3. `MANIFEST_URL` está en `src/data/manifest.ts`; el id del manifiesto es el `<ID>` de `.../<user>/<ID>/raw`.

## Paso 1 — Datos del nivel

- **id**: `n5`, `n4`, `n3`.
- **palabras**: array JSON. Guardar en `scratchpad/<id>.json`.

```json
{ "id": 1, "word": "あかい", "kanji": "赤い", "meaning": "Rojo", "category": "colores" }
```
`id` número único en el nivel, `word` en kana, `kanji` string o `null`, `meaning` no vacío, `category` en minúsculas (la app capitaliza al mostrar; sin categoría cae en `variados`).

## Paso 2 — Validar (imprescindible, parar si falla)

```bash
node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
const p = process.argv[1]; const d = JSON.parse(readFileSync(p,"utf8"));
if(!Array.isArray(d)){ console.error("La raíz debe ser un array"); process.exit(1); }
const problems=[], seen=new Set(), out=[];
d.forEach((w,i)=>{
  const id=Number(w.id), word=(w.word??"").trim(), meaning=(w.meaning??"").trim();
  const kanji=typeof w.kanji==="string"?w.kanji.trim():"", category=(w.category??"").trim().toLowerCase();
  if(Number.isNaN(id)) problems.push(`#${i}: id inválido`); else if(seen.has(id)) problems.push(`id duplicado ${id}`); else seen.add(id);
  if(!word) problems.push(`${id}: falta word`); if(!meaning) problems.push(`${id}: falta meaning`); if(!category) problems.push(`${id}: falta category`);
  if(/[a-zA-Z가-힣]/.test(word)) problems.push(`${id}: caracteres latinos en word "${word}"`);
  if(kanji && /[a-zA-Z가-힣]/.test(kanji)) problems.push(`${id}: caracteres latinos en kanji "${kanji}"`);
  out.push({ id, word, kanji: kanji||null, meaning, category });
});
if(problems.length){ console.error("PROBLEMAS:\n- "+problems.join("\n- ")); process.exit(1); }
writeFileSync(p, JSON.stringify(out,null,2)+"\n"); console.log("OK", out.length, "palabras");
' scratchpad/<id>.json
```

## Paso 3 — Subir el gist de palabras

- **Nivel nuevo**: `gh gist create scratchpad/<id>.json --public --filename <id>.json --desc "Japan Flashcards — <NOMBRE>"`. Imprime la URL de página (`https://gist.github.com/<user>/<ID>`): úsala tal cual como `url` (la app la convierte a raw y así siempre sirve la última versión).
- **Nivel existente**: obtener su gist id de la `url` en el manifiesto y hacer PATCH:
  ```bash
  jq -n --arg fn "<id>.json" --rawfile c scratchpad/<id>.json '{files: {($fn): {content: $c}}}' | gh api -X PATCH gists/<GIST_ID> --input -
  ```
  Y terminar: el manifiesto no cambia.

## Paso 4 — Registrar/activar en el manifiesto

```bash
M=<MANIFEST_ID>; MFILE=$(gh api gists/$M --jq '.files | keys[0]')
gh api gists/$M --jq ".files[\"$MFILE\"].content" > scratchpad/manifest.json
```
Con node: si ya existe la entrada con ese `id` (p.ej. `n4` con `url: ""`), poner su `url`; si no, hacer push de `{ id, name, description, url }`. Luego:
```bash
jq -n --arg fn "$MFILE" --rawfile c scratchpad/manifest.json '{files: {($fn): {content: $c}}}' | gh api -X PATCH gists/$M --input -
```

## Paso 5 — Verificar

```bash
curl -s "$(grep -oE "https://[^'\"]+" src/data/manifest.ts)?$(date +%s)" | jq -c '[.[] | {id, url}]'
curl -s "<url-del-gist>/raw" | jq 'length'
```
Recordar al usuario recargar la app (hard-reload o ~5 min de caché CDN). No requiere rebuild ni deploy.
