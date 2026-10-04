# Japan Flashcards

PWA para estudiar vocabulario japonés por nivel JLPT. React + Vite + Tailwind, sin backend: los datos viven en gists de GitHub y el progreso en el navegador.

## Qué hace

- **Niveles**: N5 activo; N4 y N3 aparecen como "Próximamente" cuando el manifiesto los lista con `url: ""`.
- **Filtro** por categoría (chips de color), búsqueda por kana, kanji o significado, y orden por más falladas, no vistas o あ → ん.
- **Tres modos**: Flashcard, Elegir (opción múltiple) y Escribir (español → kana, acepta katakana y kanji).
- **Repetición espaciada** tipo Leitner: 5 cajas con intervalos de 0, 1, 3, 7 y 21 días. "Repaso del día" juega las vencidas, "Practicar las que fallo" las falladas alguna vez.
- **Sesión**: categoría visible, audio con `speechSynthesis`, deshacer la última respuesta, atajos de teclado (espacio voltea, ← fallé, → acerté, 1-4 en Elegir), y "Repetir solo estas" al terminar.
- **Tu progreso**: racha, sesiones y aciertos de la semana, calendario de 8 semanas, barra por etapa Leitner y categorías donde más fallas. Desde ahí se borran los datos locales.

## Desarrollo

```bash
pnpm install
pnpm dev       # http://localhost:5173
pnpm build     # tsc + vite build → dist/
pnpm lint
```

Deploy en Netlify con `netlify.toml` (Node 22, publica `dist/`).

## Datos

La app carga en vivo desde gists, sin rebuild:

1. **Manifiesto** (`MANIFEST_URL` en `src/data/manifest.ts`): array de niveles `{ id, name, description, url }`. Con `url: ""` el nivel sale deshabilitado.
2. **Gist por nivel**: array de palabras.

```json
{ "id": 1, "word": "いしゃ", "kanji": "医者", "meaning": "Doctor", "category": "profesiones" }
```

`kanji` puede ser `null`. `category` en minúsculas; si falta cae en `variados`. Las URLs de página de gist se convierten a raw automáticamente. Hay caché en `localStorage` como respaldo offline.

Para añadir o actualizar un nivel desde Claude Code: `/add-level` (`.claude/skills/add-level`). Valida el JSON, sube el gist y actualiza el manifiesto.

## Estructura

```
src/
  context/FlashcardsContext.tsx  estado global: niveles, selección, stats, sesión, Leitner
  data/                          tipos, carga remota y caché, URL del manifiesto
  routes/                        LevelList (home), LevelDetail, Session, Progress, InstallGuide
  components/                    FlashcardView, ChoiceView, TypingView, SessionSummary, ui/
  lib/                           categories (colores de chips), srs, speech, utils
```

## Almacenamiento local

| Clave          | Contenido                                        |
| -------------- | ------------------------------------------------ |
| `jf.selection` | ids seleccionados por nivel                      |
| `jf.stats`     | por palabra: `seen`, `wrong`, `box`, `due`       |
| `jf.days`      | días con práctica (racha y calendario)           |
| `jf.sessions`  | últimas 200 sesiones terminadas                  |
| `jf.cache:*`   | manifiesto y palabras para uso offline           |
