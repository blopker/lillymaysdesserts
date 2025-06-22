import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Ollama } from "ollama";

const ollama = new Ollama();

interface GridEntry {
  href: string;
  alt_text: string;
}

async function loadExistingGrid(outputPath: string): Promise<GridEntry[]> {
  try {
    await access(outputPath);
    const content = await readFile(outputPath, "utf-8");
    return JSON.parse(content) as GridEntry[];
  } catch (error) {
    console.log("No existing grid.json found, starting fresh");
    return [];
  }
}

async function saveGrid(
  outputPath: string,
  entries: GridEntry[],
): Promise<void> {
  const sorted = entries.sort((a, b) => a.href.localeCompare(b.href));
  await writeFile(outputPath, JSON.stringify(sorted, null, 2));
}

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
    // Load existing grid data
    let existingEntries = await loadExistingGrid(outputPath);
    console.log(`Loaded ${existingEntries.length} existing entries`);

    // Read all files in the grid directory
    const files = await readdir(inputDir);

    // Filter for image files
    const imageFiles = files.filter((file: string) =>
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file),
    );

    console.log(`Found ${imageFiles.length} images in grid folder`);

    // Create set of current files for cleanup
    const currentFileHrefs = new Set(imageFiles.map((file) => `grid/${file}`));

    // Remove entries for files that no longer exist
    const initialCount = existingEntries.length;
    existingEntries = existingEntries.filter((entry) =>
      currentFileHrefs.has(entry.href),
    );
    const removedCount = initialCount - existingEntries.length;
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} entries for non-existent files`);
      await saveGrid(outputPath, existingEntries);
    }

    // Create map of existing entries for quick lookup
    const existingMap = new Map<string, GridEntry>();
    existingEntries.forEach((entry) => existingMap.set(entry.href, entry));

    // Filter out images that already have alt text
    const imagesToProcess = imageFiles.filter((file) => {
      const href = `grid/${file}`;
      return !existingMap.has(href);
    });

    console.log(`${imagesToProcess.length} images need processing`);

    if (imagesToProcess.length === 0) {
      console.log("All images already have alt text!");
      return;
    }

    // Process each remaining image
    let processedCount = 0;
    for (const imageFile of imagesToProcess) {
      const imagePath = join(inputDir, imageFile);
      const altText = await generateAltText(imagePath, imageFile);
      console.log(`Generated alt text for ${imageFile}: ${altText}`);

      // Add new entry
      existingEntries.push({
        href: `grid/${imageFile}`,
        alt_text: altText,
      });

      // Save after each image
      await saveGrid(outputPath, existingEntries);
      processedCount++;

      console.log(
        `Progress: ${processedCount}/${imagesToProcess.length} images processed`,
      );

      // Add a small delay to avoid overwhelming the model
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`\nSuccessfully processed ${processedCount} new images`);
    console.log(`Total entries in grid.json: ${existingEntries.length}`);
    console.log(`Output saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the script
main();
