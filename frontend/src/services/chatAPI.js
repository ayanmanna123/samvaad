// // API Service
// const API_URL = 'http://localhost:5000/api';

// const api = {
//   async getConversations(token) {
//     const response = await fetch(`${API_URL}/conversations`, {
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       }
//     });
//     return response.json();
//   },

//   async getMessages(conversationId, token, page = 1) {
//     const response = await fetch(`${API_URL}/messages/${conversationId}?page=${page}&limit=50`, {
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       }
//     });
//     return response.json();
//   },

//   async sendMessage(data, token) {
//     const response = await fetch(`${API_URL}/messages/send`, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(data)
//     });
//     return response.json();
//   },

//   async uploadMedia(formData, token) {
//     const response = await fetch(`${API_URL}/messages/upload-media`, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${token}`
//       },
//       body: formData
//     });
//     return response.json();
//   },

//   async markAsRead(messageId, token) {
//     const response = await fetch(`${API_URL}/messages/${messageId}/read`, {
//       method: 'PUT',
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       }
//     });
//     return response.json();
//   },

//   async deleteMessage(messageId, deleteFor, token) {
//     const response = await fetch(`${API_URL}/messages/${messageId}`, {
//       method: 'DELETE',
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({ deleteFor })
//     });
//     return response.json();
//   },

//   async searchUsers(query, token) {
//     const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`, {
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       }
//     });
//     return response.json();
//   },

//   async createConversation(participantId, token) {
//     const response = await fetch(`${API_URL}/conversations/create`, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({ participantId, type: 'one-on-one' })
//     });
//     return response.json();
//   },

//   async createGroupConversation(participantIds, name, token) {
//     const response = await fetch(`${API_URL}/conversations`, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({ participantIds, name, type: 'group' })
//     });
//     return response.json();
//   }
// };

// API Service
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = {
  async getConversations(token) {
    const response = await fetch(`${API_URL}/conversations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },

  async getContacts(token) {
    const response = await fetch(`${API_URL}/contacts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const json = await response.json();
    // Normalize: return array of contacts when possible
    return json.data || json.contacts || json;
  },

  async getMessages(conversationId, token, page = 1) {
    const response = await fetch(
      `${API_URL}/messages/${conversationId}?page=${page}&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.json();
  },

  async sendMessage(data, token) {
    const response = await fetch(`${API_URL}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async uploadMedia(formData, token) {
    const response = await fetch(`${API_URL}/messages/upload-media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return response.json();
  },

  async markAsRead(messageId, token) {
    const response = await fetch(`${API_URL}/messages/${messageId}/read`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },

  async deleteMessage(messageId, deleteFor, token) {
    const response = await fetch(`${API_URL}/messages/${messageId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deleteFor }),
    });
    return response.json();
  },

  async searchUsers(query, token) {
    const response = await fetch(
      `${API_URL}/users/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.json();
  },

  async createConversation(participantId, token) {
    const response = await fetch(`${API_URL}/conversations/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ participantId, type: "one-on-one" }),
    });
    return response.json();
  },

  async createGroupConversation(participantIds, name, token) {
    const response = await fetch(`${API_URL}/conversations/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participants: participantIds,
        groupName: name,
        type: "group",
      }),
    });
    return response.json();
  },

  async updateGroupInfo(conversationId, data, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/group`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    return response.json();
  },

  async sendGroupInvite(conversationId, userId, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/invite`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      },
    );
    return response.json();
  },

  async respondGroupInvite(conversationId, accept, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/invite/respond`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accept }),
      },
    );
    return response.json();
  },

  async addParticipant(conversationId, userId, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/participants`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      },
    );
    return response.json();
  },

  async removeParticipant(conversationId, userId, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/participants`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      },
    );
    return response.json();
  },

  async leaveGroup(conversationId, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/leave`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.json();
  },

  async makeAdmin(conversationId, userId, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/admins`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      },
    );
    return response.json();
  },

  async removeAdmin(conversationId, userId, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/admins`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      },
    );
    return response.json();
  },

  async votePoll(messageId, optionIndex, token) {
    const response = await fetch(`${API_URL}/messages/${messageId}/vote`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ optionIndex }),
    });
    return response.json();
  },

  async subscribePush(subscription, token) {
    const response = await fetch(`${API_URL}/users/subscribe-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });
    return response.json();
  },

  async unsubscribePush(endpoint, token) {
    const response = await fetch(`${API_URL}/users/unsubscribe-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint }),
    });
    return response.json();
  },

  async clearChat(conversationId, token) {
    const response = await fetch(
      `${API_URL}/messages/conversation/${conversationId}/clear`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.json();
  },

  async editMessage(messageId, content, token) {
    const response = await fetch(`${API_URL}/messages/${messageId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
    return response.json();
  },

  async forwardMessage(messageId, conversationIds, token) {
    const response = await fetch(`${API_URL}/messages/${messageId}/forward`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ conversationIds }),
    });
    return response.json();
  },

  async getTasks(token) {
    const response = await fetch(`${API_URL}/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },

  async createTask(data, token) {
    const response = await fetch(`${API_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async updateTask(id, data, token) {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async deleteTask(id, token) {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },

  async togglePin(conversationId, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/pin`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.json();
  },

  async toggleArchive(conversationId, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/archive`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.json();
  },

  async searchMessages(query, token, conversationId = null) {
    let url = `${API_URL}/messages/search/all?q=${encodeURIComponent(query)}`;
    if (conversationId) url += `&conversationId=${conversationId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },

  async getConversationMedia(conversationId, type, token) {
    const response = await fetch(
      `${API_URL}/messages/${conversationId}/media?type=${type}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.json();
  },

  async getStatuses(token) {
    const response = await fetch(`${API_URL}/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },

  async createStatus(data, token) {
    const response = await fetch(`${API_URL}/status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async markStatusSeen(id, token) {
    const response = await fetch(`${API_URL}/status/${id}/seen`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },

  async deleteStatus(id, token) {
    const response = await fetch(`${API_URL}/status/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },
  async updateEphemeralSettings(conversationId, data, token) {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/ephemeral`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    return response.json();
  },

  async syncContacts(contacts, token) {
    const response = await fetch(`${API_URL}/users/sync-contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contacts }),
    });
    return response.json();
  },
};

// ✅ FIX: Export getUsers function properly
export const getUsers = async (token) => {
  const response = await fetch(`${API_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
};

export const apiUpdateProfile = async (data) => {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const apiUpdateSettings = async (settings) => {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/users/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ settings }),
  });
  return res.json();
};

// ✅ Export all other methods

export const getConversations = api.getConversations;
export const getContacts = api.getContacts;
export const getMessages = api.getMessages;
export const sendMessage = api.sendMessage;
export const uploadMedia = api.uploadMedia;
export const markAsRead = api.markAsRead;
export const deleteMessage = api.deleteMessage;
export const searchUsers = api.searchUsers;
export const createConversation = api.createConversation;
export const createGroupConversation = api.createGroupConversation;
export const addParticipant = api.addParticipant;
export const removeParticipant = api.removeParticipant;
export const leaveGroup = api.leaveGroup;
export const makeAdmin = api.makeAdmin;
export const removeAdmin = api.removeAdmin;
export const votePoll = api.votePoll;
export const updateGroupInfo = api.updateGroupInfo;
export const sendGroupInvite = api.sendGroupInvite;
export const respondGroupInvite = api.respondGroupInvite;
export const subscribePush = api.subscribePush;
export const unsubscribePush = api.unsubscribePush;
export const getTasks = api.getTasks;
export const createTask = api.createTask;
export const updateTask = api.updateTask;
export const deleteTask = api.deleteTask;
export const togglePin = api.togglePin;
export const toggleArchive = api.toggleArchive;
export const searchMessages = api.searchMessages;
export const getConversationMedia = api.getConversationMedia;
export const getStatuses = api.getStatuses;
export const createStatus = api.createStatus;
export const markStatusSeen = api.markStatusSeen;
export const deleteStatus = api.deleteStatus;
export const updateEphemeralSettings = api.updateEphemeralSettings;

export default api;
