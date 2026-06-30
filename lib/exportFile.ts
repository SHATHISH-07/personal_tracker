import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';

export interface ExportExcelOptions {
  sheetName?: string;
  cols?: any[];
}

export const exportExcel = async (data: any[], filename: string, options?: ExportExcelOptions) => {
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

      // Optionally trigger the native share dialog
      if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
        try {
          await Share.share({
            title: filename,
            url: result.uri,
          });
        } catch (shareError) {
          console.error("Error sharing Excel file:", shareError);
        }
      }
    } else {
      // Web browser environment
      XLSX.writeFile(wb, filename);
    }
  } catch (error) {
    console.error("Error exporting Excel file:", error);
  }
};

export const exportCsv = async (csvString: string, filename: string) => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Android/iOS Capacitor environment
      const result = await Filesystem.writeFile({
        path: filename,
        data: csvString,
        directory: Directory.Documents,
        encoding: Encoding.UTF8, // Use UTF8 encoding for raw string data
      });

      // Optionally trigger the native share dialog
      if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
        try {
          await Share.share({
            title: filename,
            url: result.uri,
          });
        } catch (shareError) {
          console.error("Error sharing CSV file:", shareError);
        }
      }
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
    }
  } catch (error) {
    console.error("Error exporting CSV file:", error);
  }
};
