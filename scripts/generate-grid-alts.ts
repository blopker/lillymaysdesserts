import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Ollama } from "ollama";

const ollama = new Ollama();

async function generateAltText(
  imagePath: string,
  imageName: string,
): Promise<string> {
  try {
    console.log(`Processing ${imageName}...`);

    // Read image as base64
    const imageBuffer = await readFile(imagePath);
    const base64Image = imageBuffer.toString("base64");

    // Generate alt text using Ollama
    const response = await ollama.generate({
      model: "gemma3:12b",
      prompt: `You are an expert at writing SEO-optimized alt text for images. Analyze this image and provide a concise, descriptive alt text that:
1. Describes what's visible in the image accurately
2. Is optimized for SEO and accessibility
3. Uses natural language without keyword stuffing
4. Is between 50-125 characters when possible
5. Focuses on the main subject and important details

Respond with ONLY the alt text, no additional explanation or formatting.`,
      images: [base64Image],
      stream: false,
    });

    return response.response.trim();
  } catch (error) {
    console.error(`Error processing ${imageName}:`, error);
    // Fallback alt text if generation fails
    return `Image of ${imageName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "").replace(/[-_]/g, " ")}`;
  }
}

async function main() {
  const inputDir = join(process.cwd(), "public", "images", "grid");
  const outputPath = join(process.cwd(), "src", "grid.json");

  try {
    // Read all files in the grid directory
    const files = await readdir(inputDir);

    // Filter for image files
    const imageFiles = files.filter((file: string) =>
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file),
    );

    console.log(`Found ${imageFiles.length} images to process`);

    // Process each image
    const results = [];

    for (const imageFile of imageFiles) {
      const imagePath = join(inputDir, imageFile);
      const altText = await generateAltText(imagePath, imageFile);
      console.log(`Generated alt text for ${imageFile}: ${altText}`);

      results.push({
        href: `grid/${imageFile}`,
        alt_text: altText,
      });

      // Add a small delay to avoid overwhelming the model
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Sort results by filename for consistency
    results.sort((a, b) => a.href.localeCompare(b.href));

    // Write the results to grid.json
    await writeFile(outputPath, JSON.stringify(results, null, 2));

    console.log(
      `\nSuccessfully generated alt text for ${results.length} images`,
    );
    console.log(`Output saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the script
main();
