import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContactSocial, ClientInsertContactSocial } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useAddSocial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, data }: { contactId: string; data: ClientInsertContactSocial }) => {
      try {
        const res = await apiRequest("POST", `/api/contacts/${contactId}/socials`, data);
        return await res.json();
      } catch (error) {
        console.error('Detailed error in useAddSocial:', {
          contactId,
          data,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', variables.contactId] });
    }
  });
}

export function useUpdateSocial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId, data }: { id: string; contactId: string; data: Partial<ContactSocial> }) => {
      try {
        const res = await apiRequest("PATCH", `/api/socials/${id}`, data);
        return await res.json();
      } catch (error) {
        console.error('Detailed error in useUpdateSocial:', {
          id,
          contactId,
          data,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', variables.contactId] });
    }
  });
}

export function useDeleteSocial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      try {
        await apiRequest("DELETE", `/api/socials/${id}`);
      } catch (error) {
        console.error('Detailed error in useDeleteSocial:', {
          id,
          contactId,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', variables.contactId] });
    }
  });
}
