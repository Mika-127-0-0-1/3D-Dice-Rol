// import './App.css'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import Floor from './components/createFloor'
import DiceArray from './components/dice'
import { PerspectiveCamera } from '@react-three/drei'
import { useRef} from 'react'

function App() {
  const diceArrayRef = useRef<{ throwDice: () => void }>(null);

  // const [score, setScore] = useState<string>('');

  const showRollResults = (scoreValue: number) => {
    // setScore((prevScore) => {
    //   if (prevScore === '') {
    //     return `${scoreValue}`;
    //   } else {
    //     return `${prevScore} + ${scoreValue}`;
    //   }
    // });
    console.log(scoreValue); // Log for debugging
  };

  const handleThrowDice = () => {
    if (diceArrayRef.current) {
      diceArrayRef.current.throwDice();
    }
  };

  return (
      <div className="content">
        {/* Canvas element for rendering Three.js content */}
        <Canvas id="canvas" style={{ height: '100vh', width: '100%' }}>
          <ambientLight intensity={2} />
          <pointLight
            color={0xffffff}
            intensity={50}
            position={[10, 15, 0]}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={5}
            shadow-camera-far={400}
          />
          <PerspectiveCamera
            makeDefault
            fov={45}
            aspect={window.innerWidth / window.innerHeight}
            near={0.1}
            far={300}
            position={[0, 0.5, 4].map((v) => v * 7) as [number, number, number]}
          />
          <Physics
            allowSleep
            gravity={[0, -50, 0]}
            defaultContactMaterial={{ restitution: 0.3 }}
          >
            <DiceArray onShowRollResults={showRollResults} ref={diceArrayRef}/>
            <Floor />
          </Physics>
        </Canvas>

        {/* UI controls below the Canvas */}
        <div className="ui-controls" style={{ position: 'absolute', top: '10px', left: '10px' }}>
          {/* <div className="score">Score: <span id="score">{score}</span></div> */}
          <button onClick={handleThrowDice} id='roll-btn'>Throw the dice</button>
        </div>
      </div>
  )
}

export default App
