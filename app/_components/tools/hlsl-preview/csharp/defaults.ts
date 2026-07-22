export const DEFAULT_CSHARP = `void Draw(float time)
{
    Vector2 center = new Vector2(iResolution.x * 0.5f, iResolution.y * 0.5f);
    DrawRing(center, time, 1.0f);
}

void DrawRing(Vector2 drawCenter, float timeValue, float wink)
{
    float frameHeightOut = 0.750f;
    float frameHeightIn = 0.875f;

    // Outer dark ring (vertex color)
    List<Vertex2D> bars = [];
    for (int i = 0; i <= 100; i++)
    {
        Color drawColor = Color.White * 0.35f * wink;
        float rotValue = i / 100f * MathHelper.TwoPi + timeValue * 0.1f;
        bars.Add(drawCenter + new Vector2(0, 120).RotatedBy(rotValue), drawColor, new Vector3(i / 50f, frameHeightOut, 0));
        bars.Add(drawCenter + new Vector2(0, 96).RotatedBy(rotValue), drawColor, new Vector3(i / 50f, frameHeightIn, 0));
    }
    Main.graphics.GraphicsDevice.Textures[0] = Textures.RingSoft;
    Main.graphics.GraphicsDevice.DrawUserPrimitives(PrimitiveType.TriangleStrip, bars.ToArray(), 0, bars.Count - 2);

    // Outer colorful ring
    bars = [];
    for (int i = 0; i <= 100; i++)
    {
        float lerpValue = (MathF.Sin(i / 25f * MathHelper.TwoPi + timeValue) + 1) * 0.5f;
        Color drawColor = Color.Lerp(new Color(0f, 0.7f, 1f, 1f), new Color(0.1f, 0.2f, 0.8f, 1f), lerpValue) * wink;
        float rotValue = i / 100f * MathHelper.TwoPi + timeValue * 0.1f;
        bars.Add(drawCenter + new Vector2(0, 118).RotatedBy(rotValue), drawColor, new Vector3(i / 50f, frameHeightOut, 0));
        bars.Add(drawCenter + new Vector2(0, 98).RotatedBy(rotValue), drawColor, new Vector3(i / 50f, frameHeightIn, 0));
    }
    Main.graphics.GraphicsDevice.Textures[0] = Textures.RingColor;
    Main.graphics.GraphicsDevice.DrawUserPrimitives(PrimitiveType.TriangleStrip, bars.ToArray(), 0, bars.Count - 2);

    // Inner ring
    bars = [];
    for (int i = 0; i <= 100; i++)
    {
        float lerpValue = (MathF.Sin(i / 12.5f * MathHelper.TwoPi + timeValue) + 1) * 0.5f;
        Color drawColor = Color.Lerp(new Color(0f, 0.9f, 1f, 1f), new Color(0.2f, 0.3f, 1f, 1f), lerpValue) * wink * 0.85f;
        float rotValue = i / 100f * MathHelper.TwoPi + timeValue * -0.05f;
        bars.Add(drawCenter + new Vector2(0, 72).RotatedBy(rotValue), drawColor, new Vector3(i / 25f, 0.2f, 0));
        bars.Add(drawCenter + new Vector2(0, 52).RotatedBy(rotValue), drawColor, new Vector3(i / 25f, 0.5f, 0));
    }
    Main.graphics.GraphicsDevice.Textures[0] = Textures.RingInner;
    Main.graphics.GraphicsDevice.DrawUserPrimitives(PrimitiveType.TriangleStrip, bars.ToArray(), 0, bars.Count - 2);
}
`;
