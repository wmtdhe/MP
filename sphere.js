
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

var days=0;


// Create a place to store sphere geometry
var sphereVertexPositionBuffer;

//Create a place to store normals for shading
var sphereVertexNormalBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0,-20.0,150.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

//-----new added
var sum=0;
var spPos=[];		
var spVel=[];		
var spCol=[];
var spRad=[];									
var timeCurr=Date.now();
var timePrev=Date.now();
//-------------------------------------------------------------------------
function setupSphereBuffers() {
    
    var sphereSoup=[];
    var sphereNormals=[];
    var numT=sphereFromSubdivision(6,sphereSoup,sphereNormals);
    console.log("Generated ", numT, " triangles"); 
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT*3;
    console.log(sphereSoup.length/9);
    
    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                  gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT*3;
    
    console.log("Normals ", sphereNormals.length/3);     
}

//-------------------------------------------------------------------------
function drawSphere(){
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);
 gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);      
}

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    
  shaderProgram.uniformAmbientMatColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientMatColor");  
  shaderProgram.uniformDiffuseMatColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseMatColor");
  shaderProgram.uniformSpecularMatColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularMatColor");    
    
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//-------------------------------------------------------------------------
function uploadMaterialToShader(a,d,s) {
  gl.uniform3fv(shaderProgram.uniformAmbientMatColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMatColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMatColorLoc, s);
}


//----------------------------------------------------------------------------------
function setupBuffers() {
    setupSphereBuffers();     
}

//----------------------------------------------------------------------------------
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
 
    // Set up light parameters
    var Ia = vec3.fromValues(1.0,1.0,1.0);
    var Id = vec3.fromValues(1.0,1.0,1.0);
    var Is = vec3.fromValues(1.0,1.0,1.0);
    
    var lightPosEye4 = vec4.fromValues(0.0,0.0,50.0,1.0);
    lightPosEye4 = vec4.transformMat4(lightPosEye4,lightPosEye4,mvMatrix);
    //console.log(vec4.str(lightPosEye4))
    var lightPosEye = vec3.fromValues(lightPosEye4[0],lightPosEye4[1],lightPosEye4[2]);
    
    //draw Sun
    // Set up material parameters    
    var ka = vec3.fromValues(0.0,0.0,0.0);
    var kd = vec3.fromValues(0.6,0.6,0.0);
    var ks = vec3.fromValues(0.4,0.4,0.0);
    //mvPushMatrix();
    vec3.set(transformVec,10,10,10);
   mat4.scale(mvMatrix, mvMatrix,transformVec);
    uploadLightsToShader(lightPosEye,Ia,Id,Is);
    uploadMaterialToShader(ka,kd,ks);
    //setMatrixUniforms();
    //drawSphere();
    //mvPopMatrix();
    
    //move to Earth position    
   // mvPushMatrix();   
   // mat4.rotateZ(mvMatrix, mvMatrix, degToRad(360*(days/365.0))); 
   // vec3.set(transformVec,35.0,0.0,0.0);
   // mat4.translate(mvMatrix, mvMatrix,transformVec);

    //draw moon 
    // Set up material parameters    
   // ka = vec3.fromValues(0.0,0.0,0.0);
   // kd = vec3.fromValues(0.4,0.4,0.4);
   // ks = vec3.fromValues(0.1,0.1,0.1);
    
   // mvPushMatrix();
   // mat4.rotateZ(mvMatrix, mvMatrix, degToRad(360*(days/27.0)));  
    //vec3.set(transformVec,10.0,0.0,0.0);
  //  mat4.translate(mvMatrix, mvMatrix,transformVec);
   // vec3.set(transformVec,2.0,2.0,1.0);
   // mat4.scale(mvMatrix, mvMatrix,transformVec);     
   // uploadLightsToShader(lightPosEye,Ia,Id,Is);
   // uploadMaterialToShader(ka,kd,ks);
   // setMatrixUniforms();
   // drawSphere();
   // mvPopMatrix(); 
    
    //Draw Earth
    // Set up material parameters
   // ka = vec3.fromValues(0.0,0.0,0.0);
   // kd = vec3.fromValues(0.0,0.0,0.5);
   // ks = vec3.fromValues(0.0,0.0,0.5);
    
   // mvPushMatrix();
   // vec3.set(transformVec,5.0,5.0,1.0);
   // mat4.scale(mvMatrix, mvMatrix,transformVec);    
   // uploadLightsToShader(lightPosEye,Ia,Id,Is);
   // uploadMaterialToShader(ka,kd,ks);
   // setMatrixUniforms();
   // drawSphere();
    //mvPopMatrix();
    //---draw spheres---new added
    for(var i=0;i<sum;i++){
        //saf
        mvPushMatrix();
        mat4.lookAt(mvMatrix,eyePt,viewPt,up);
		vec3.set(transformVec, spPos[i*3], spPos[i*3+1], spPos[i*3+2]);
		mat4.translate(mvMatrix, mvMatrix,transformVec);							
		vec3.set(transformVec,spRad[i], spRad[i], spRad[i]);
		mat4.scale(mvMatrix, mvMatrix,transformVec);							
		var ma = vec3.fromValues(spCol[i*3], spCol[i*3+1], spCol[i*3+2]);		
		var md = vec3.fromValues(spCol[i*3]*0.8, spCol[i*3+1]*0.5, spCol[i*3+2]*0.5);
        var ms = vec3.fromValues(0.0,0.0,0.5);
        uploadMaterialToShader(ma,md,ms);
        setMatrixUniforms();
        drawSphere();
        mvPopMatrix();
    }
  
}

//----------------------------------------------------------------------------------
function animate() {
    //new time
	timeCurr=Date.now();
	var t=(timeCurr-timePrev)/800;
    //new prev
	timePrev=timeCurr;

    for(var i=0; i<sum; i++){
        //new position
		spPos[i*3]=spPos[i*3]+(spVel[i*3]*t);
		spPos[i*3+1]=spPos[i*3+1]+(spVel[i*3+1]*t);
		spPos[i*3+2]=spPos[i*3+2]+(spVel[i*3+2]*t);
		//collision
        var friction=0.95;
		for(var j=0; j<3; j++){
			if(spPos[i*3+j]+spRad[i]>55){
                //center
				spPos[i*3+j]=55-((spPos[i*3+j]+spRad[i])-55)-spRad[i];
                //direction changed
				spVel[i*3+j]=-spVel[i*3+j]*friction;
			}else if(spPos[i*3+j]-spRad[i]<-55){
				spPos[i*3+j]=-55-((spPos[i*3+j]-spRad[i])+55)+spRad[i];
				spVel[i*3+j]=-spVel[i*3+j]*friction;
			}
		}
        //if (Math.abs(spVel[i*3+1])<5){spPos[i*3+1]=-50;}
        //console.log(spPos[4]);
        //update velocity
        var drag=0.8;
		var dt=Math.pow(drag,t);
        //gravity
        var g=98;
		spVel[i*3]=spVel[i*3]*dt;
		spVel[i*3+1]=(spVel[i*3+1]*dt)-(g*t);
        //if (spVel[i*3+1]<10){spVel[i*3+1]=0;}
		spVel[i*3+2]=spVel[i*3+2]*dt;
        //console.log(spVel[i*3+1]);
        console.log(spPos[1]);
        console.log(spVel[1]);
        if(spPos[i*3+1]>-56 && spPos[i*3+1]<-49){
                if(Math.abs(spVel[i*3+1])<8){
                   spVel[i*3]=0;
                    spVel[i*3+1]=0;
                    spVel[i*3+2]=0;
                   }
            }
	}
}

//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    handleKeys();
    draw();
    animate();
}


//Code to handle user interaction
var currentlyPressedKeys = {};

function handleKeyDown(event) {
        currentlyPressedKeys[event.keyCode] = true;
}


function handleKeyUp(event) {
        currentlyPressedKeys[event.keyCode] = false;
}

function handleKeys() {
    //add new spheres
        if (currentlyPressedKeys[38]) {
            // Up cursor key
        sum++;
		spPos.push(Math.random()*50-50);
		spPos.push(Math.random()*50-10);
		spPos.push(Math.random()*50+12);
		spVel.push(Math.random()*50);
		spVel.push(Math.random()*50);
		spVel.push(Math.random()*50);
		spCol.push(Math.random());
		spCol.push(Math.random());
		spCol.push(Math.random());
		spRad.push((Math.random()*5)+0.5);
        }
    
        if(currentlyPressedKeys[40]){		
        // down arrow key
        //reset
		while(spPos.length>0){
			spPos.pop();
		}
		while(spVel.length>0){
			spVel.pop();
		}
        while(spCol.length>0){
			spCol.pop();
		}
		while(spRad.length>0){
			spRad.pop();
		}
		sum=0;
    }
}