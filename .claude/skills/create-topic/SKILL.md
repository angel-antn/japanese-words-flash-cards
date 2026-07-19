---
name: create-topic
description: Crear un topic nuevo de flashcards (Japan Flashcards) — crea el gist de palabras y lo registra en el gist manifiesto, sin tocar código ni redeploy. Úsalo cuando el usuario quiera "añadir/crear un topic/tema nuevo", "agregar un mazo de palabras", o registrar un nuevo set de vocabulario/kanji para la PWA de flashcards.
allowed-tools: Bash, Read, Edit, Write
---

# Crear un topic nuevo (Japan Flashcards)

Esta app carga los datos **en vivo desde gists**: un gist *manifiesto* lista los topics y cada topic apunta a un gist con sus palabras. Añadir un topic = **crear un gist de palabras** + **añadir una entrada al manifiesto**. No hay que tocar el código ni reconstruir: la app lo toma al recargar (tras expirar el caché CDN ~5 min o con hard-reload).

## Prerrequisitos (verificar primero)

1. Ejecutar desde la raíz del proyecto.
2. `gh auth status` debe mostrar sesión iniciada **con scope `gist`**. Si falta, decir al usuario que corra `! gh auth login -s gist` (o `gh auth refresh -s gist`) y parar.
3. Leer `MANIFEST_URL` de `src/data/manifest.ts` para obtener el gist manifiesto (no lo hardcodees). Extraer el **id** del manifiesto de esa URL (`.../<user>/<ID>/raw`).

## Paso 1 — Reunir datos del topic

Pídele al usuario (o infiere de lo que ya dio):
- **id**: kebab-case, único (p.ej. `adjectives-n5`, `kanji-n4`). Debe NO existir ya en el manifiesto.
- **name**: nombre visible (p.ej. `Adjetivos N5`).
- **description**: una línea.
- **palabras**: un array JSON con el formato de abajo. Puede venir como archivo (`.json`), texto pegado, o el usuario puede pedir generarlas. Guarda el array en `scratchpad/new-topic-words.json`.

Formato de cada palabra:
```json
{ "id": 1, "word": "あかい", "kanji": "赤い", "meaning": "Rojo" }
```
Reglas: `id` número (único dentro del topic), `word` en kana, `kanji` string o `null` (si no tiene), `meaning` NO vacío (las entradas sin significado se descartan en la app).

## Paso 2 — Validar y normalizar (imprescindible)

Corre este validador sobre el JSON del usuario. **Si reporta problemas, muéstralos y para** hasta que el usuario los corrija — no subas datos rotos (mismo criterio que `src/data/remote.ts`).

```bash
node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
const p = process.argv[1];
let d; try { d = JSON.parse(readFileSync(p,"utf8")); } catch(e){ console.error("JSON inválido:", e.message); process.exit(1); }
if(!Array.isArray(d)){ console.error("La raíz debe ser un array"); process.exit(1); }
const problems=[], seen=new Set(), out=[];
d.forEach((w,i)=>{
  if(!w||typeof w!=="object"){ problems.push(`#${i}: no es objeto`); return; }
  const id = typeof w.id==="number"?w.id:Number(w.id);
  const word = typeof w.word==="string"?w.word.trim():"";
  const meaning = typeof w.meaning==="string"?w.meaning.trim():"";
  let kanji = typeof w.kanji==="string"?w.kanji.trim():"";
  if(Number.isNaN(id)) problems.push(`#${i}: id inválido`);
  else if(seen.has(id)) problems.push(`id duplicado: ${id}`); else seen.add(id);
  if(!word) problems.push(`id ${id}: falta word`);
  if(!meaning) problems.push(`id ${id}: falta meaning (se descartaría)`);
  // Latin/hangul coladas en kana/kanji = casi siempre encoding roto
  if(/[a-zA-Z가-힣]/.test(word)) problems.push(`id ${id}: word con caracteres latinos/hangul: "${word}"`);
  if(kanji && /[a-zA-Z가-힣]/.test(kanji)) problems.push(`id ${id}: kanji con caracteres latinos/hangul: "${kanji}"`);
  out.push({ id, word, kanji: kanji===""?null:kanji, meaning });
});
if(problems.length){ console.error("PROBLEMAS:\n- "+problems.join("\n- ")); process.exit(1); }
writeFileSync(p, JSON.stringify(out,null,2)+"\n");
console.log(`OK: ${out.length} palabras válidas, normalizadas y reescritas en ${p}`);
' scratchpad/new-topic-words.json
```

## Paso 3 — Crear el gist de palabras

```bash
gh gist create scratchpad/new-topic-words.json \
  --public \
  --filename "<id>.json" \
  --desc "Japan Flashcards — <name>"
```
`gh gist create` imprime la **URL de la página** del gist (`https://gist.github.com/<user>/<ID>`). Guárdala: será el `url` de la entrada del manifiesto. **Usa la URL de página (sin SHA)**, no la `raw_url` fija de la API — la de página siempre sirve la última versión, así los cambios se reflejan (`toRawGistUrl` en la app la convierte a raw).

## Paso 4 — Registrar en el manifiesto

Con `MANIFEST_ID` (Paso 0) y la URL del gist nuevo:

```bash
# nombre del archivo dentro del gist manifiesto (suele ser único)
MFILE=$(gh api gists/$MANIFEST_ID --jq '.files | keys[0]')
# contenido actual
gh api gists/$MANIFEST_ID --jq ".files[\"$MFILE\"].content" > scratchpad/manifest.json
```
Verifica que el `id` no exista ya en `scratchpad/manifest.json`. Añade la entrada nueva al array (con node, no a mano):

```bash
node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
const [file,id,name,description,url] = process.argv.slice(1);
const arr = JSON.parse(readFileSync(file,"utf8"));
if(arr.some(t=>t.id===id)){ console.error("Ya existe un topic con id "+id); process.exit(1); }
arr.push({ id, name, description, url });
writeFileSync(file, JSON.stringify(arr,null,2)+"\n");
console.log("Manifiesto actualizado con "+id);
' scratchpad/manifest.json "<id>" "<name>" "<description>" "<url-del-gist-nuevo>"
```

Sube el manifiesto actualizado (PATCH por API, no interactivo):
```bash
jq -n --arg fn "$MFILE" --rawfile c scratchpad/manifest.json \
  '{files: {($fn): {content: $c}}}' | gh api -X PATCH gists/$MANIFEST_ID --input -
```
(Si no hay `jq`, construir el body con node y pasarlo por `--input -`.)

## Paso 5 — Verificar

```bash
# manifiesto trae el topic nuevo
curl -s "$(grep -oE "https://[^'\"]+" src/data/manifest.ts | head -1)" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);console.log(a.map(t=>t.id).join(", "))})'
# palabras del gist nuevo cargan (usar la raw: página + /raw)
curl -s "<url-del-gist-nuevo>/raw" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);console.log("palabras:",a.length)})'
```
Confirmar counts esperados y 0 sospechas de encoding. Recordar al usuario: **recargar la app** (hard-reload o esperar ~5 min por el caché CDN) para ver el topic nuevo — no requiere rebuild ni deploy.

## Notas
- La app filtra palabras sin `meaning` y normaliza `kanji: ""`→`null`; aun así, limpia en el origen (gist) para que el count sea el correcto.
- Para **editar palabras** de un topic existente: `gh gist edit <id>` del gist de ese topic. No necesita este skill.
