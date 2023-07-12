# PDF to Image-PDF Converter

This tool is a Node.js application designed to batch convert PDF files into image-based PDFs, making the text unselectable and uncopyable. It is highly useful when dealing with sensitive documents that you want to protect from easy copy-pasting of content.

## Setup Instructions

1. **File Placement**:
    - Place the PDF files to be converted inside the `/original` folder.

2. **Dependency Installation**:
    - This tool requires ImageMagick and Ghostscript to function. These dependencies are used to convert PDFs to images and optimize the final output, respectively.
    - ImageMagick installation:
        - On Ubuntu:
            ```
            sudo apt-get install imagemagick
            ```
        - On macOS:
            ```
            brew install imagemagick
            ```
    - Ghostscript installation:
        - On Ubuntu:
            ```
            sudo apt-get install ghostscript
            ```
        - On macOS:
            ```
            brew install ghostscript
            ```

3. **Execution**:
    - With the setup complete, run the application using the command:
        ```
        node index.js
        ```

## Code Overview

This application uses built-in Node.js packages `fs`, `util`, `child_process`, `process`, and `os` to manipulate files, execute shell commands, and optimize resource usage based on system configuration.

Here's a brief overview of the steps involved in the conversion process:

- `convertPDFToImage`: This function converts the input PDF file to a series of images using ImageMagick.
- `convertImageToPDF`: This function converts the previously generated images back into a single PDF file.
- `optimizePDF`: This function optimizes the resulting image-based PDF using Ghostscript.
- `cleanUpIntermediateFiles`: This function deletes any intermediate images and unoptimized PDFs created during the conversion process.
- `convertPDFToImagesAndBack`: This is a wrapper function that executes the above steps in sequence for each input PDF file.

Upon execution, the script processes each file in the `/original` directory, converting them into image-based PDFs and storing the result in the `/output` directory. If any errors occur during this process, they're recorded in `errors.json`.

## Notes

The application leverages multithreading capabilities, processing multiple files concurrently up to the maximum number of cores available on your system. This makes the tool highly efficient when dealing with a large batch of files.

Please note that after conversion, the resulting PDFs will contain images instead of selectable text. This means you will not be able to search or copy text from the converted files.
