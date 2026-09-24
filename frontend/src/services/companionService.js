/**
 * SmritiRoots Companion Service
 * Interacts with backend Voice AI Companion endpoints via api.js.
 */
import { api } from '../api';

export const sendCompanionMessage = async ({ conversationId, message, language }) => {
  return await api.sendCompanionMessage({ conversationId, message, language });
};

export const getCompanionConversation = async (conversationId) => {
  return await api.getCompanionConversation(conversationId);
};

export const createCompanionConversation = async (language) => {
  return await api.createCompanionConversation(language);
};

export const getCompanionConversations = async () => {
  return await api.getCompanionConversations();
};
