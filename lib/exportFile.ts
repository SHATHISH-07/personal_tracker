import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import * as XLSX from 'xlsx';

export interface ExportExcelOptions {
  sheetName?: string;
  cols?: Array<{ wch?: number; wpx?: number; hidden?: boolean }>;
}

export const exportExcel = async (
  data: Array<Record<string, unknown>>,
  filename: string,
  options?: ExportExcelOptions
): Promise<string | undefined> => {
  try {
    // Generate the worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Apply column formatting if provided
    if (options?.cols) {
      ws["!cols"] = options.cols;
    }

    // Create the workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    const sheetName = options?.sheetName || "Sheet1";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    if (Capacitor.isNativePlatform()) {
      // Android/iOS Capacitor environment
      const base64Data = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      // Save file to the device's documents directory
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
      });

      return result.uri;
    } else {
      // Web browser environment
      XLSX.writeFile(wb, filename);
      return undefined;
    }
  } catch (error) {
    console.error("Error exporting Excel file:", error);
    return undefined;
  }
};

export const exportCsv = async (csvString: string, filename: string): Promise<string | undefined> => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Android/iOS Capacitor environment
      const result = await Filesystem.writeFile({
        path: filename,
        data: csvString,
        directory: Directory.Documents,
        encoding: Encoding.UTF8, // Use UTF8 encoding for raw string data
      });

      return result.uri;
    } else {
      // Web browser environment
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return undefined;
    }
  } catch (error) {
    console.error("Error exporting CSV file:", error);
    return undefined;
  }
};
