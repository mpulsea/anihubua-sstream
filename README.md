# AniHub UA for SkyStream

Український AniHub provider для SkyStream.

Перший реліз орієнтований на iPhone / iOS: каталог і пошук працюють через офіційний AniHub API, а відтворення пробує Fenix / ASHDI / MoonAnime та прямі HLS-потоки.

Current plugin version: **1**.

## Repository URL

`https://raw.githubusercontent.com/mpulsea/anihubua-sstream/main/repo.json`

## Structure

- `anihub/` - provider source and manifest
- `dist/` - generated SkyStream package and plugin list
- `.github/workflows/build.yml` - automatic repository build/deploy workflow

## First iPhone test

1. У SkyStream додати Repository URL вище.
2. Встановити **AniHub UA**.
3. Перевірити Home -> Search -> відкриття тайтлу -> список серій -> запуск серії.
4. Для першого тесту краще взяти тайтл з Fenix або ASHDI та кількома серіями.
