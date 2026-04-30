import { useEditorStore } from '../store/editorStore'
import { EXERCISES } from '../engine/exercises'

const ExercisePanel = () => {
  const {
    exerciseIndex,
    exerciseScore,
    exerciseFeedback,
    validateExercise,
    nextExercise,
    exitTraining,
    addNotification,
  } = useEditorStore()

  const ex = EXERCISES[exerciseIndex]
  if (!ex) return null

  const diffClass =
    ex.difficulty === 'Intermédiaire' ? 'difficulty-medium' :
    ex.difficulty === 'Avancé' ? 'difficulty-hard' : ''

  return (
    <div className="exercise-panel">
      <div className="exercise-header">
        <div className="exercise-meta">
          <span className={`exercise-badge ${diffClass}`}>
            {exerciseIndex + 1}/{EXERCISES.length}
          </span>
          <span className={`exercise-badge ${diffClass}`}>{ex.difficulty}</span>
          <span className="exercise-title">{ex.title}</span>
        </div>

        <div className="exercise-actions">
          {exerciseFeedback && (
            <span className="score-display">
              Score : <strong>{exerciseScore}</strong>/100
            </span>
          )}
          <button
            className="btn-secondary"
            onClick={() => addNotification('info', ex.hint, 6000)}
          >
            Indice
          </button>
          <button className="btn-primary btn-simulate" onClick={validateExercise}>
            Valider
          </button>
          {exerciseScore === 100 && (
            <button className="btn-secondary" onClick={nextExercise}>
              Suivant →
            </button>
          )}
          <button className="btn-ghost" onClick={exitTraining}>
            ✕ Quitter
          </button>
        </div>
      </div>

      <div className="exercise-body">
        <div
          className="exercise-description"
          dangerouslySetInnerHTML={{ __html: ex.description }}
        />

        {exerciseFeedback && (
          <div className="exercise-feedback">
            {exerciseFeedback.map((item, i) => (
              <div key={i} className={`feedback-item ${item.ok ? 'feedback-ok' : 'feedback-err'}`}>
                {item.ok ? '✓' : '✗'} {item.msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExercisePanel
