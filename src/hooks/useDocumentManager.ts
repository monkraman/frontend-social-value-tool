import { useState, useEffect, useCallback } from 'react';
import type { DocumentItem } from '../types';
import { fetchDocuments, uploadDocumentFile, deleteDocumentById } from '../api/client';

export function useDocumentManager() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    fetchDocuments()
      .then((docs) => {
        if (isSubscribed) setDocuments(docs);
      })
      .catch((err) => {
        console.error('Failed to load initial documents:', err);
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setStatusMessage({ text: `Processing and vectorizing "${file.name}"...` });
    try {
      const res = await uploadDocumentFile(file);
      setStatusMessage({ text: res.message, isError: !res.success });
      await loadDocuments();
      return res;
    } catch (err: any) {
      setStatusMessage({ text: `Upload failed: ${err.message}`, isError: true });
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [loadDocuments]);

  const deleteDocument = useCallback(async (id: string, filename: string) => {
    try {
      await deleteDocumentById(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setStatusMessage({ text: `Deleted "${filename}" successfully.` });
    } catch (err: any) {
      setStatusMessage({ text: `Failed to delete "${filename}": ${err.message}`, isError: true });
    }
  }, []);

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunks_count || 0), 0);

  return {
    documents,
    isLoading,
    isUploading,
    statusMessage,
    totalChunks,
    loadDocuments,
    uploadFile,
    deleteDocument,
    clearStatus: () => setStatusMessage(null)
  };
}
