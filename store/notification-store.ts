import { create } from 'zustand'

interface Notification {
  id: string
  title: string
  message: string
  conversationId?: string
  createdAt: string
}

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void
  clearNotifications: () => void
  markAsRead: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        },
        ...state.notifications,
      ].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    })),
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
  markAsRead: () => set({ unreadCount: 0 }),
}))
