from collections import deque
from pathlib import Path

from PIL import Image


SOURCE = Path("public/sprites/lumi-atlas-source.png")
TRANSPARENT_ATLAS = Path("public/sprites/lumi-atlas-transparent.png")
OUT = Path("public/sprites")
OUTFITS = ("cozy", "academy", "adventurer")
MOUTHS = ("closed", "small", "open")


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def remove_connected_magenta(source: Image.Image) -> Image.Image:
    """Remove only magenta connected to the canvas edge.

    A global color key also catches Lumi's pale skin and pink mouth. Restricting
    the matte to edge-connected pixels preserves those interior colors while
    still removing the generated magenta halo around the hair.
    """
    image = source.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    queued = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def is_key_like(red: int, green: int, blue: int) -> bool:
        dominance = min(red, blue) - green
        return red > 150 and blue > 130 and green < 210 and dominance > 18

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if queued[index]:
            return
        red, green, blue, _ = pixels[x, y]
        if not is_key_like(red, green, blue):
            return
        queued[index] = 1
        queue.append((x, y))

    # Seed every unmistakably chroma-magenta region, including background
    # pockets enclosed by curls of hair, then grow through softer fringe pixels.
    for y in range(height):
        for x in range(width):
            red, green, blue, _ = pixels[x, y]
            if red > 150 and blue > 130 and green < 150 and min(red, blue) - green >= 110:
                enqueue(x, y)

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        red, green, blue, _ = pixels[x, y]
        dominance = min(red, blue) - green
        alpha = round(255 * (1.0 - smoothstep((dominance - 18) / 92)))

        if alpha <= 3:
            pixels[x, y] = (0, 0, 0, 0)
        else:
            # Remove the red component of the magenta spill while retaining
            # blue hair highlights on softly antialiased edge pixels.
            cleaned_red = min(red, max(green, round(blue * 0.72)))
            pixels[x, y] = (cleaned_red, green, blue, alpha)

        for next_x, next_y in (
            (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1),
            (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1), (x + 1, y + 1),
        ):
            if 0 <= next_x < width and 0 <= next_y < height:
                enqueue(next_x, next_y)

    return image


def main() -> None:
    atlas = remove_connected_magenta(Image.open(SOURCE))
    atlas.save(TRANSPARENT_ATLAS, optimize=True)
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
