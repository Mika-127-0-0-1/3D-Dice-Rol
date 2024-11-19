import { useBox } from "@react-three/cannon";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
  
const params = {
  numberOfDice: 2,
  segments: 40,
  edgeRadius: .07,
  notchRadius: .12,
  notchDepth: .1,
};

interface DiceArrayProps {
  onShowRollResults: (score: number) => void;
}

/*
geometry modification means looping through the box vertices to access theXYZ coordinates in the
boxGeometry.attributes.position
array. Once the XYZcoordinates are changed, they can be reapplied to the position attribute.
*/
function createDiceGeometry(){
  let boxGeometry = new THREE.BoxGeometry(1, 1, 1, params.segments, params.segments, params.segments);
  const positionAttributes = boxGeometry.attributes.position;
  
  const subCubeHalfSize = 0.5 - params.edgeRadius;

  for(let i=0; i<positionAttributes.count; i++){
    let position = new THREE.Vector3().fromBufferAttribute(positionAttributes, i);
    /*
      As we have a box side equal to 1, we know that the X, Y, and Z coordinates varyfrom -0.5 to 0.5.
      If all 3 vertex coordinates are close to -0.5 or 0.5, the geometry vertex is close to the boxvertex.
      If only 2 of 3 coordinates are close to -0.5 or 0.5, the geometric vertex is close to the edgeof the box. 
      Other vertices keep the original position. For example, if X and Y coordinatesare close to -0.5 or 0.5, 
      the vertex is close to the edge parallel to axis Z.
    */
    const subCube = new THREE.Vector3(
      Math.sign(position.x), 
      Math.sign(position.y), 
      Math.sign(position.z)
    ).multiplyScalar(subCubeHalfSize); 
    const addition = new THREE.Vector3().subVectors(position, subCube);

    /*
      The original vertex position is a sum of subCube and addition
      vectors. We keep subCube without change because it points to the sphere center. The
      addition vector we normalizeso it points to the sphere with a radius = 1
      ...and multiply it by the rounding radius value to move coordinate on the desired sphere.
    */
    if(Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize){
      // possition is colse to box vertex
      addition.normalize().multiplyScalar(params.edgeRadius);
      position = subCube.add(addition);

      /*
      The same approach works for the box edges. For example, take the geometry verticesthat are close 
      to the box edges parallel to the Z-axis. Their position.z is already correct,so only the X and Y 
      coordinates need to be modified. In other words, position.z is not modified addition.z should be 
      set to zero before normalizing addition vector
      */
    }else if(Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize){
      // position is close to edge parallel to axis Z
      addition.z = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.x = subCube.x + addition.x;
      position.y = subCube.y + addition.y;
    }else if(Math.abs(position.x) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize){
      // position is close to edge parallel to axis Y
      addition.y = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.x = subCube.x + addition.x;
      position.z = subCube.z + addition.z;
    }else if(Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize){
      // position is close to edge parallel to axis X
      addition.x = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.y = subCube.y + addition.y;
      position.z = subCube.z + addition.z;
    }

    /*
      The next step is to add one to six smooth hollows to the sides of the cube. To start, let’sadd one to the 
      center of top side. We can select the top side vertices simply by checkingif the position.y value equals to 
      0.5. For selected vertices, we’d decrease position.y by height of the notch. The challenge is about 
      calculating the notch shape. Let’s think about 2D space first andform a centered symmetrical smooth impulse 
      on the XY coordinates. 
      1. First step is a cosine function for a wave with a peak at x = 0.
      2. Then make it a positive number by adding 1 to Y.
      The period of cosine is 2 x π, meaning the central wave starts at x = –π and ends in x =π. It would be more 
      handy to have it from -1 to 1, so we multiply x by π.
      3. As we need only a single wave at the center, we limit x value to be from -1 to 1.

      Great! The impulse can be parameterized with PULSE_WIDTH and PULSE_DEPTH variablesand that’s how we use it 
      for the dice notch. Turning the shape into 3D space is pretty easy. The 2D wave defines Y as a function of 
      X.To make Y a function of both X and Z, we just multiply two waves – first one taken as afunction of X and 
      second as a function of Z.
    */
    const notchWave = (v: number) => {
      v = (1 / params.notchRadius) * v;
      v = Math.PI * Math.max(-1, Math.min(1, v));
      return params.notchDepth * (Math.cos(v) + 1.);
    }
    const notch = (pos: [number, number]) => notchWave(pos[0]) * notchWave(pos[1]);

    /*
      For the top side we subtract the notch([position.x, position.z]) value from position.y , and similarly for 
      other sides of the box. As our impulse is centered at the (0,0) point, we can shift the notches around the 
      side surface by adding the offset to the notch function arguments.
    */
    const offset = .23;

    if (position.y === .5) {
        position.y -= notch([position.x, position.z]);
    } else if (position.x === .5) {
        position.x -= notch([position.y + offset, position.z + offset]);
        position.x -= notch([position.y - offset, position.z - offset]);
    } else if (position.z === .5) {
        position.z -= notch([position.x - offset, position.y + offset]);
        position.z -= notch([position.x, position.y]);
        position.z -= notch([position.x + offset, position.y - offset]);
    } else if (position.z === -.5) {
        position.z += notch([position.x + offset, position.y + offset]);
        position.z += notch([position.x + offset, position.y - offset]);
        position.z += notch([position.x - offset, position.y + offset]);
        position.z += notch([position.x - offset, position.y - offset]);
    } else if (position.x === -.5) {
        position.x += notch([position.y + offset, position.z + offset]);
        position.x += notch([position.y + offset, position.z - offset]);
        position.x += notch([position.y, position.z]);
        position.x += notch([position.y - offset, position.z + offset]);
        position.x += notch([position.y - offset, position.z - offset]);
    } else if (position.y === -.5) {
        position.y += notch([position.x + offset, position.z + offset]);
        position.y += notch([position.x + offset, position.z]);
        position.y += notch([position.x + offset, position.z - offset]);
        position.y += notch([position.x - offset, position.z + offset]);
        position.y += notch([position.x - offset, position.z]);
        position.y += notch([position.x - offset, position.z - offset]);
    }

    positionAttributes.setXYZ(i, position.x, position.y, position.z);
  }
  /*
    Often, simply calling the computeVertexNormals() after modifying the geometry verticesis sufficient to 
    update their normals. The method computes normal for each vertex byaveraging the normals of neighbour 
    faces (of faces that share this vertex). It’s a very easyway to smooth geometry, unless geometry has 
    duplicated vertices. It’s common to have 1+ geometry vertices placed on the same position, mainly tomaintain 
    the UV and normal attributes.

    To fix the seams we need to remove allduplicated vertices before calling computeVertexNormals(). It can 
    beeasily done with mergeVertices() methodwhich meant to delete the vertices withvery same set of attributes. 
    Duplicatedvertices have normal and uv attributesinherited from BoxGeometry that wedelete. Once it’s done, 
    duplicated verticeshave only a position attribute and verticeswith same position that can beautomatically merged.
  */
  boxGeometry.deleteAttribute('normal');
  boxGeometry.deleteAttribute('uv');
  boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry) as THREE.BoxGeometry;

  boxGeometry.computeVertexNormals();

  return boxGeometry;
}

/*
  To color the dice, we just apply a grey MeshStandardMaterial to it. 15/28 To color the notches, we can make 
  a simple trick and place six planes inside thecube so they come out from the notches.
  We finish up the dice by coloring the innerpanels in black and grouping them with themain mesh.
*/
function createInnerGeometry() {
  //Keep plane size equal to flat surface of cube
  const baseGeometry = new THREE.PlaneGeometry(1 - 2 * params.edgeRadius, 1 - 2 * params.edgeRadius);
  // offset planes just behind box sides
  const offset = .48;
  // return BufferGeometryUtils.mergeBufferGeometries([
  return BufferGeometryUtils.mergeGeometries([
    baseGeometry.clone().translate(0, 0, offset),
      baseGeometry.clone().translate(0, 0, -offset),
      baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, -offset, 0),
      baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, offset, 0),
      baseGeometry.clone().rotateY(.5 * Math.PI).translate(-offset, 0, 0),
      baseGeometry.clone().rotateY(.5 * Math.PI).translate(offset, 0, 0),
  ], false);
}

const DiceMesh: React.FC<{ position: [number, number, number], onMount: (ref: React.MutableRefObject<any>, api: any) => void }> = ({ position, onMount }) => {
  const [ref, api] = useBox<THREE.Group>(() => ({
    mass: 1,
    position: position,
    args: [1, 1, 1],
    type: 'Dynamic',
    // onCollideEnd(e) {
    //   // console.log('Collision ended:', e);

      
    // },
    onCollide(e) {
      // console.log('Collision detected:', e);

      // You can check if the event involves a "sleep" state indirectly
      // by handling the collision end or impact velocity
      if (e.contact.impactVelocity < 0.25) {  // Example threshold for sleep state
        // api.allowSleep.set(false);
        
        console.log('Simulated sleep event');

        // e.body.addEventListener("removed", (e: any) => {
          // e.body.allowSleep = false;
    
          let euler = new THREE.Euler();
          // euler = e.body.quaternion;
          e.body.quaternion.setFromEuler(euler);
    
          const eps = 0.1;
          const isZero = (angle: number) => Math.abs(angle) < eps;
          const isHalfPi = (angle: number) => Math.abs(angle - 0.5 * Math.PI) < eps;
          const isMinusHalfPi = (angle: number) => Math.abs(0.5 * Math.PI + angle) < eps;
          const isPiOrMinusPi = (angle: number) => Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps;
    
          if (isZero(euler.z)) {
            if (isZero(euler.x)) {
              // showRollResults(1);
              console.log(1);
            } else if (isHalfPi(euler.x)) {
              // showRollResults(4);
              console.log(4);
            } else if (isMinusHalfPi(euler.x)) {
              // showRollResults(3);
              console.log(3);
            } else if (isPiOrMinusPi(euler.x)) {
              // showRollResults(6);
              console.log(6);
            } else {
              // e.body.allowSleep = true;
            }
          } else if (isHalfPi(euler.z)) {
            // showRollResults(2);
              console.log(2);
            } else if (isMinusHalfPi(euler.z)) {
            // showRollResults(5);
              console.log(5);
            } else {
            // e.body.allowSleep = true;
          }
        // });
      }
    },
  }));

  useEffect(() => {
    onMount(ref, api);
  }, [ref, api, onMount]);

  return (
    <group ref={ref}>
      <mesh castShadow>
        <primitive attach="geometry" object={createDiceGeometry()} />
        <meshStandardMaterial color={0xeeeeee} />
      </mesh>
      <mesh>
        <primitive attach="geometry" object={createInnerGeometry()} />
        <meshStandardMaterial color={0x000000} roughness={0} metalness={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const DiceArray = forwardRef<{ throwDice: () => void }, DiceArrayProps>(({ onShowRollResults }, ref ) => {
  // Create a ref array to hold all dice meshes and their associated physics APIs
  const diceRefs = useRef<{ ref: React.MutableRefObject<any>, api: any }[]>([]);

  const handleMount = (ref: React.MutableRefObject<any>, api: any) => {
    diceRefs.current.push({ ref, api });
  };

  const showRollResults = (score: number) => {
    onShowRollResults(score);
    // console.log(score);
  };

  const throwDice = () => {
    diceRefs.current.forEach(({ ref, api }, dIdx) => {
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);

      const newPosition = new THREE.Vector3(6, dIdx * 1.5, 0);
      api.position.copy(newPosition);
      ref.current.position.copy(newPosition);

      ref.current.rotation.set(2 * Math.PI * Math.random(), 0, 2 * Math.PI * Math.random());
      api.quaternion.copy(ref.current.quaternion);

      const force = 3 + 5 * Math.random();
      api.applyImpulse(
        [ -force, force, 0 ],
        [ 0, 0, 0.2 ]
      );

      api.allowSleep = true;
    });
    showRollResults(5);
  };

  useImperativeHandle(ref, () => ({
    throwDice,
  }));
   
  return (
    <>
      {Array.from({ length: params.numberOfDice }).map((_, i) => (
        <DiceMesh key={i} position={[1 ,i * 2, 0]} onMount={handleMount} />
      ))}
    </>
  );
});

export default DiceArray;