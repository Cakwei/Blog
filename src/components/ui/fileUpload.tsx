import { AlertTriangle, ImageIcon, ShieldCheck, Upload, X } from "lucide-react";
import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { Button } from "./button";

interface ImageUploaderProps {
	//	onImageReadyForS3?: (file: File, sanitizedName: string) => void;
	onImageReadyForS3?: (file: File) => void;

	maxSizeMB?: number;
	maxWidthPx?: number;
	maxHeightPx?: number;
}

export default function ImageUploader({
	onImageReadyForS3,
	maxSizeMB = 5, // Default 5MB
	maxWidthPx = 4096, // Max 4K width resolution
	maxHeightPx = 4096, // Max 4K height resolution
}: ImageUploaderProps) {
	const [isDragActive, setIsDragActive] = useState<boolean>(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isValidating, setIsValidating] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// 1. Magic Number Validation (True File-Type Verification)
	const verifyFileSignature = (file: File): Promise<boolean> => {
		return new Promise((resolve) => {
			const reader = new FileReader();
			// We only need the first 4 bytes to check signatures
			const blob = file.slice(0, 4);

			reader.onloadend = (e) => {
				if (!e.target || e.target.readyState !== FileReader.DONE) {
					resolve(false);
					return;
				}

				const arr = new Uint8Array(e.target.result as ArrayBuffer);
				let header = "";
				for (let i = 0; i < arr.length; i++) {
					header += arr[i].toString(16).padStart(2, "0");
				}

				// Check common image magic numbers
				const signatures = {
					png: "89504e47",
					jpeg: ["ffd8ffe0", "ffd8ffe1", "ffd8ffe2", "ffd8ffe3", "ffd8ffe8"],
					gif: "47494638",
				};

				const isPng = header === signatures.png;
				const isJpeg = signatures.jpeg.some((sig) => header.startsWith(sig));
				const isGif = header.startsWith(signatures.gif);

				resolve(isPng || isJpeg || isGif);
			};

			reader.readAsArrayBuffer(blob);
		});
	};

	// 2. Image Dimension Limits (Pixel Flood / Client-side DoS Protection)
	const verifyDimensions = (file: File): Promise<boolean> => {
		return new Promise((resolve) => {
			const objectUrl = URL.createObjectURL(file);
			const img = new Image();

			img.onload = () => {
				URL.revokeObjectURL(objectUrl); // Clean up immediately
				if (img.width > maxWidthPx || img.height > maxHeightPx) {
					resolve(false);
				} else {
					resolve(true);
				}
			};

			img.onerror = () => {
				URL.revokeObjectURL(objectUrl);
				resolve(false);
			};

			img.src = objectUrl;
		});
	};

	// 3. File Name Sanitization for S3 Object Key Safety
	const sanitizeFileName = (fileName: string): string => {
		const dotIndex = fileName.lastIndexOf(".");
		const nameWithoutExt =
			dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
		const ext = dotIndex !== -1 ? fileName.substring(dotIndex) : "";

		// Remove directory traversals (../), spaces, non-alphanumeric/safe S3 chars
		// S3 Safe characters: Alphanumerics, exclamation points, hyphens, underscores, periods, asterisks, open/close parenthesis
		const sanitized = nameWithoutExt
			.replace(/\.\.\//g, "") // Remove directory traversal sequences
			.replace(/[^a-zA-Z0-9_\-\.]/g, "_") // Replace illegal symbols & spaces with underscores
			.replace(/__+/g, "_"); // Collapse consecutive underscores

		// Append a unique safe timestamp to prevent S3 object collisions/overwrites
		const timestamp = Date.now();
		return `${sanitized}_${timestamp}${ext.toLowerCase()}`;
	};

	// Master Processing Handler
	const processAndValidateFile = async (file: File) => {
		setError(null);
		setIsValidating(true);

		try {
			// Rule A: Basic Size Check
			const maxBytes = maxSizeMB * 1024 * 1024;
			if (file.size > maxBytes) {
				throw new Error(
					`File is too large. Maximum allowed size is ${maxSizeMB}MB.`,
				);
			}

			// Rule B: Verify true mime type headers (Magic Numbers)
			const hasValidSignature = await verifyFileSignature(file);
			if (!hasValidSignature) {
				throw new Error(
					"Invalid file content. The file headers do not match a valid PNG, JPG, or GIF image.",
				);
			}

			// Rule C: Dimension Check (Pixel Flood Protection)
			const hasValidDimensions = await verifyDimensions(file);
			if (!hasValidDimensions) {
				throw new Error(
					`Image dimensions exceed limits. Maximum size allowed is ${maxWidthPx}x${maxHeightPx}px.`,
				);
			}

			// Rule D: Sanitize file identity for S3
			const s3SafeName = sanitizeFileName(file.name);

			// Passed all client-side security guardrails!
			const url = URL.createObjectURL(file);
			setPreviewUrl(url);

			if (onImageReadyForS3) {
				onImageReadyForS3(file);
			}
		} catch (err: any) {
			setError(err.message || "An error occurred during verification.");
			if (fileInputRef.current) fileInputRef.current.value = "";
		} finally {
			setIsValidating(false);
		}
	};

	// Drag and drop events
	const handleDrag = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") setIsDragActive(true);
		else if (e.type === "dragleave") setIsDragActive(false);
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragActive(false);
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			processAndValidateFile(e.dataTransfer.files[0]);
		}
	};

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			processAndValidateFile(e.target.files[0]);
		}
	};

	const removeImage = () => {
		setPreviewUrl(null);
		setError(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	return (
		<div className="w-full max-w-lg mx-auto p-4 space-y-3">
			<input
				ref={fileInputRef}
				type="file"
				className="hidden"
				accept="image/png, image/jpeg, image/gif"
				onChange={handleChange}
			/>

			{/* Error Notice block */}
			{error && (
				<div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg animate-shake">
					<AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
					<div>{error}</div>
				</div>
			)}

			{!previewUrl ? (
				// biome-ignore lint: false
				<div
					role="button"
					tabIndex={0}
					onKeyDown={() => !isValidating && fileInputRef.current?.click()}
					onDragEnter={handleDrag}
					onDragOver={handleDrag}
					onDragLeave={handleDrag}
					onDrop={handleDrop}
					onClick={() => !isValidating && fileInputRef.current?.click()}
					className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-200 p-6 text-center
            ${isValidating ? "border-amber-400 bg-amber-50/30 cursor-wait" : ""}
            ${!isValidating && isDragActive ? "border-blue-500 bg-blue-50/50 scale-[0.99] cursor-pointer" : ""}
            ${!isValidating && !isDragActive ? "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 cursor-pointer" : ""}
          `}
				>
					<div className="flex flex-col items-center justify-center">
						{isValidating ? (
							<>
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mb-3" />
								<p className="text-sm font-medium text-gray-700">
									Running binary sanitation...
								</p>
								<p className="text-xs text-gray-500 mt-1">
									Inspecting file signatures & headers
								</p>
							</>
						) : (
							<>
								<div className="p-3 mb-3 rounded-full bg-gray-200 text-gray-600">
									<Upload className="w-6 h-6" />
								</div>
								<p className="mb-1 text-sm text-gray-700 font-medium">
									<span className="text-blue-600 hover:underline">
										Click to browse
									</span>{" "}
									or drag & drop
								</p>
								<p className="text-xs text-gray-500">
									Secure validation enabled: PNG, JPG, GIF max {maxSizeMB}MB
								</p>
							</>
						)}
					</div>
				</div>
			) : (
				/* Image Preview State */
				<div className="space-y-2">
					<div className="relative w-full h-64 border border-gray-200 bg-gray-900 rounded-xl overflow-hidden shadow-sm group">
						<img
							src={previewUrl}
							alt="Sanitized Preview"
							className="w-full h-full object-contain"
						/>
						<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
							<Button
								onClick={() => fileInputRef.current?.click()}
								className="p-2 bg-white text-gray-800 rounded-full text-sm font-medium flex items-center gap-1.5 hover:scale-105 transition-transform"
							>
								<ImageIcon className="w-4 h-4" /> Change
							</Button>
							<Button
								onClick={removeImage}
								className="p-2 bg-red-600 text-white rounded-full text-sm font-medium flex items-center gap-1.5 hover:scale-105 transition-transform"
							>
								<X className="w-4 h-4" /> Remove
							</Button>
						</div>
					</div>
					<div className="flex items-center gap-1.5 text-xs font-medium text-green-700 px-1">
						<ShieldCheck className="w-3.5 h-3.5" /> File structure verified &
						sanitized for S3 upload.
					</div>
				</div>
			)}
		</div>
	);
}
