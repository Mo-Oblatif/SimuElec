import { useEditorStore } from '../store/editorStore'
import { EXERCISES } from '../engine/exercises'
import './ExerciseSelector.css'

const ExerciseSelector = () => {
  const { closeExerciseSelector, startExercise } = useEditorStore()

  const handleSelect = (index: number) => {
    startExercise(index)
    closeExerciseSelector()
  }

  return (
    <div className="ex-sel-overlay" onClick={closeExerciseSelector}>
      <div className="ex-sel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ex-sel-header">
          <h2>Choisir un exercice</h2>
          <button className="ex-sel-close" onClick={closeExerciseSelector}>✕</button>
        </div>
        <div className="ex-sel-list">
          {EXERCISES.map((ex, i) => {
            const diffClass =
              ex.difficulty === 'Avancé' ? 'hard' :
              ex.difficulty === 'Intermédiaire' ? 'medium' : ''
            return (
              <div key={ex.id} className="ex-card" onClick={() => handleSelect(i)}>
                <div className="ex-card-row">
                  <span className="ex-num">{i + 1}</span>
                  <span className={`ex-diff ${diffClass}`}>{ex.difficulty}</span>
                  <span className="ex-title">{ex.title}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ExerciseSelector
