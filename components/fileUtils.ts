
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // result includes 'data:mime/type;base64,' prefix, remove it for raw base64
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];
export const MAX_FILE_SIZE_MB = 4; // Gemini API limit for inline data is 4MB
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;


export const isValidFileType = (file: File): boolean => {
  return SUPPORTED_FILE_TYPES.includes(file.type);
};

export const isValidFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE_BYTES;
}

export const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return 'image'; // Or a specific image icon component
  }
  if (mimeType === 'application/pdf') {
    return 'pdf'; // Or a specific PDF icon component
  }
  return 'generic'; // Or a generic file icon
};