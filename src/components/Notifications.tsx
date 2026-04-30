import { useEditorStore } from '../store/editorStore'
import './Notifications.css'

const Notifications = () => {
  const { notifications, removeNotification } = useEditorStore()

  return (
    <div className="notifications-container">
      {notifications.map((notif) => (
        <div key={notif.id} className={`notification notification-${notif.type}`}>
          <span className="notification-message">{notif.message}</span>
          <button className="notification-close" onClick={() => removeNotification(notif.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

export default Notifications
