from pathlib import Path

from PIL import Image


SOURCE = Path("public/sprites/lumi-atlas-transparent.png")
OUT = Path("public/sprites")
OUTFITS = ("cozy", "academy", "adventurer")
MOUTHS = ("closed", "small", "open")


def main() -> None:
    atlas = Image.open(SOURCE).convert("RGBA")
    tile_width = atlas.width // 3
    tile_height = atlas.height // 3

    for row, mouth in enumerate(MOUTHS):
        for column, outfit in enumerate(OUTFITS):
            tile = atlas.crop(
                (
                    column * tile_width,
                    row * tile_height,
                    (column + 1) * tile_width,
                    (row + 1) * tile_height,
                )
            )
            tile.save(OUT / f"lumi-{outfit}-{mouth}.png", optimize=True)


if __name__ == "__main__":
    main()
