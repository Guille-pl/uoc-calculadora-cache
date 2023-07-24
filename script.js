class cache{

    constructor(){
        this.tipo_asignacion;
        this.algoritmo_reemplazo;
        this.direcciones = [];
        this.lineas_cache;
        this.palabras_por_bloque;
        this.tabla;
        this.btn_copiar;
        this.formulas;
    
        this.cache = [];

        this.histFIFO = [];
        this.histLRU = [];
        this.histLFU = [];

        document.querySelector('button[data-btn="ejecutar"]').addEventListener('click', ()=>this.run());
        document.querySelector('button[data-btn="reset"]').addEventListener('click', ()=>this.reset());
    }


    run(){
        this.readData();
        this.reset();
        this.setupTable();

        switch(this.tipo_asignacion){
            case 'ad':
                this.asignacionDirecta();
                break;
            case 'ca':
                this.asignacionCompletamenteAsociativa();
                break;
            case 'apc':
                
                break;
        }

        this.btn_copiar.setAttribute('data-visible', true);
        this.formulas.setAttribute('data-visible', true);

        new formulas();
    }

    reset(){
        this.tabla.innerHTML = '';
        this.cache.length = this.histFIFO.length =
        this.histLRU.length = this.histLFU.length = 0;
        this.btn_copiar.setAttribute('data-visible', false);
        this.formulas.setAttribute('data-visible', false);
    }


    readData(){
        this.tabla = document.querySelector('#contenedor_tabla table');
        this.btn_copiar = document.querySelector('#copiar_trabla');
        this.formulas = document.querySelector('#formulas');

        this.tipo_asignacion = document.querySelector('select[name="tipo_asignacion"]').value;
        this.algoritmo_reemplazo = document.querySelector('select[name="algoritmo_reemplazo"]').value;
        this.direcciones = document.querySelector('input[name="direcciones"]').value.replaceAll(' ', '').split(',').map(Number);
        this.lineas_cache = Number(document.querySelector('input[name="lineas_cache"]').value);
        this.palabras_por_bloque = Number(document.querySelector('input[name="palabras_por_bloque"]').value);
    }

    setupTable(){

        let dirInit = 0;
        let estadoInicial;

        this.tabla.innerHTML =
            `<tr id="heading">
                <th>Línea</th>
                <th class="col1">Estado Inicial</th>
            </tr>`;

        for (let i = 0; i < this.lineas_cache; i++) {

            switch(this.tipo_asignacion){
                case 'ad':
                    estadoInicial = `<td class="col1">${i}:0 (${dirInit}-${dirInit+this.palabras_por_bloque-1})</td>`;
                    break;
                case 'ca':
                    estadoInicial = 
                    `<td class="col1">${i} (${dirInit}-${dirInit+this.palabras_por_bloque-1})</td>`;
                    break;
                case 'apc':
                    
                    break;
            }
                
            this.tabla.insertAdjacentHTML('beforeend', 
                `<tr>
                    <td>${i}</td>
                    ${estadoInicial}
                </tr>`
            );

            //Guardado de estado inicial de cache
            this.cache.push(this.rellenarRangoDirecciones(dirInit));
            dirInit += this.palabras_por_bloque;
        }
    }


    rellenarRangoDirecciones(inicio){
        return [...Array(this.palabras_por_bloque).keys()].map(x => x+inicio);
    }



    /* *************************************************** */
    /* **************** Asignación Directa *************** */
    /* *************************************************** */

    asignacionDirecta(){

        let newBloque;
        let newEtiqueta;
        let newLinea;
        let primera_palabra_loque;
        
        for (const dir of this.direcciones) {

            //Si la dirección no está en caché
            if(!this.dirInCache(dir)){
                
                newBloque = Math.trunc(dir/this.palabras_por_bloque);
                newEtiqueta = Math.trunc(newBloque/this.lineas_cache);
                newLinea = newBloque % this.lineas_cache;
                primera_palabra_loque = newBloque*this.palabras_por_bloque;
                
                //Se actualiza la caché
                this.cache[newLinea] = this.rellenarRangoDirecciones(primera_palabra_loque);

                //Se actualiza la tabla
                this.tableAddColumn_AD(dir, newBloque, newEtiqueta, newLinea);
            }
        }
    }

    tableAddColumn_AD(dir, bloque, etiqueta, linea){

        let cellContent;
        let counter = 0;
        const numColumnas = this.tabla.querySelectorAll('th').length;
        const columnas = this.tabla.querySelectorAll(`td.col${numColumnas-1}`);
        const filas = this.tabla.querySelectorAll('tr:not(#heading)');

        //Header
        this.printHeader(numColumnas, dir);


        //Celdas de columna
        filas.forEach( fila => {
            
            //Celda actualizada
            if (counter == linea){
                cellContent = `${bloque}:${etiqueta} (${this.cache[linea][0]}-${this.cache[linea].at(-1)})`;

            //Celdas que no varian
            }else{
                cellContent = columnas[counter].textContent;
            }

            
            fila.insertAdjacentHTML('beforeend',
                `<td class='col${numColumnas} ${(counter == linea)? 'highlight' : ''}'>
                    ${cellContent}
                </td>`
            );

            counter++;
        });

    }


    /* *************************************************** */
    /********* Asignación Completamente Asociativa ******* */
    /* *************************************************** */

    asignacionCompletamenteAsociativa(){

        let newBloque;
        let newLinea = 0;
        let primera_palabra_loque;

        let auxLRU = 0;

        this.initFIFO();
        this.initLFU();
        
        this.direcciones.forEach ( dir => {
            
            // -------- Si la dirección ESTÁ en caché   
            if(this.dirInCache(dir)){

                switch(this.algoritmo_reemplazo){
                    case 'lru':
                        //Se añade la linea utilizada a la lista de usos
                        this.histLRU.unshift(this.dirPosInCache(dir));
                        break;
                    case 'lfu':
                        //Se suma 1 uso a la linea en la que se encuentra la dirección (LFU)
                        this.histLFU[this.dirPosInCache(dir)]++;
                        break;
                    default:
                        break;
                }

                return;
            }

            
            // -------- Si la dirección NO ESTÁ en caché

            newBloque = Math.trunc(dir/this.palabras_por_bloque);
            primera_palabra_loque = newBloque*this.palabras_por_bloque;

            //Cálculo de la linea de la caché en función del algoritmo de reemplazo
            switch(this.algoritmo_reemplazo){
                case 'fifo':
                    newLinea = this.histFIFO.indexOf(0);
                    this.histFIFO = this.histFIFO.map(elem => elem - 1);
                    this.histFIFO[newLinea] = this.lineas_cache-1;
                    break;

                case 'lru':

                    for (let i = 0; i < this.lineas_cache; i++) {
                        if(this.histLRU.indexOf(i) > auxLRU){
                            auxLRU = this.histLRU.indexOf(i);
                        }
                    }

                    newLinea = this.histLRU[auxLRU];
                    this.histLRU.unshift(newLinea);
                    auxLRU = 0;
                    break;

                case 'lfu':
                    newLinea = this.histLFU.indexOf(Math.min(...this.histLFU));
                    this.histLFU[newLinea]++;
                break;
            }
            
            //Se actualiza la caché
            this.cache[newLinea] = this.rellenarRangoDirecciones(primera_palabra_loque);

            //Se actualiza la tabla
            this.tableAddColumn_CA(dir, newBloque, newLinea);
        });
    }

    tableAddColumn_CA(dir, bloque, linea_updated){
        
        let linea = 0;
        let cellContent;
        const filas = this.tabla.querySelectorAll('tr:not(#heading)');
        const numColumnas = this.tabla.querySelectorAll('th').length;

        //Header
        this.printHeader(numColumnas, dir);

        //Celdas de columna
        filas.forEach( fila => {

            //Celda actualizada
            if (linea == linea_updated){
                cellContent = `${bloque} (${this.cache[linea_updated][0]}-${this.cache[linea_updated].at(-1)})`;

            //Celdas que no varian
            }else{
                cellContent = this.tabla.querySelectorAll(`td.col${numColumnas-1}`)[linea].textContent;
            }


            fila.insertAdjacentHTML('beforeend',
                `<td class='col${numColumnas} ${(linea_updated == linea)? 'highlight' : ''}'>
                    ${cellContent}
                </td>`
            );

            linea++;
        });

    }


    //Inicializa el historico de la cache para el algoritmo FIFO
    initFIFO(){
        this.histFIFO = [...Array(this.lineas_cache).keys()];
    }

    //Inicializa el historico de usos de la cache para el algoritmo LFU
    initLFU(){
        this.histLFU = Array(this.lineas_cache).fill(0);
    }













    

    //Comprueba si la dirección dada está en la cache
    dirInCache(dir){
        for (const linea of this.cache) {
            if(linea.includes(dir)) return true;
        }

        return false;
    }

    //Busca la linea en la que está la dirección
    dirPosInCache(dir){
        for (const linea in this.cache) {
            if(this.cache[linea].includes(dir)) return Number(linea);
        }

        return -1;
    }


    //Imprime la celda (th) que indica el fallo
    printHeader(numCol, dir){
        this.tabla.querySelector('#heading')
            .insertAdjacentHTML('beforeend',
                `<th class='col${numCol}'>
                    Fallo: <b>${dir}</b>
                </th>`
            );
    }
}




class screenshot{

    constructor(){

        this.tabla = document.querySelector('table');
        this.formattedTabla;

        document.querySelector('#copiar_trabla').addEventListener('click', ()=>{
            this.setupTable();
            this.captureTable().then(() => this.formattedTabla.remove());
        });
    }


    setupTable(){
        
        const colsVisibles = [];
        let newTabla = this.tabla.cloneNode(true);
        const columnas = this.tabla.querySelectorAll('th').length;

        this.formattedTabla = document.createElement('div');
        this.formattedTabla.setAttribute('id', 'contenedor_captura');

        for(let i = 1; i < columnas; i++){

            colsVisibles.push(i);
            
            //Se dejan 6 columnas visibles por tabla
            if(i%6 == 0 || columnas-1 == i){
                newTabla.querySelectorAll( `[class^='col']`+
                    colsVisibles.map((e)=> `:not(.col${e})`)
                    .join('')
                ).forEach((e)=>e.remove());
                
                colsVisibles.length = 0;
                this.formattedTabla.appendChild(newTabla);
                newTabla = this.tabla.cloneNode(true);
            }
        }

        document.body.appendChild(this.formattedTabla);
    }


    captureTable(){
        return new Promise(res => {
            html2canvas(this.formattedTabla).then(canvas => {
                const enlace = document.createElement('a');
                enlace.download = "Cache Screenshot";
                enlace.href = canvas.toDataURL();
                enlace.click();
                res();
            });
        });
    }
}




class formulas{

    constructor(){

        this.datos = {
            tasa_aciertos: 0,
            tasa_fallos: 0,
            t_acierto: 0,
            t_fallo: 0,
            t_medio: undefined,
            num_aciertos: 0,
            num_fallos: 0,
            accesos: 0
        }

        this.formulas = document.querySelectorAll('p[data-formula]');
        this.input_container = document.querySelectorAll('#tiempo_medio > div');
        this.input_t_acierto = document.querySelector('input[name="t_acierto"]');
        this.input_t_fallo = document.querySelector('input[name="t_fallo"]');

        this.datos.num_fallos = document.querySelectorAll('.highlight').length;
        this.datos.accesos = document.querySelector('input[name="direcciones"]').value.replaceAll(' ', '').split(',').length;

        this.calc_tasas();
        this.renderTex();
        this.set_listeners();
    }


    set_listeners(){
        this.input_t_acierto.addEventListener('input', () => this.calc_tiempo_acceso_medio());
        this.input_t_fallo.addEventListener('input', () => this.calc_tiempo_acceso_medio());
    }


    calc_tasas(){
        this.datos.num_aciertos = this.datos.accesos - this.datos.num_fallos;
        
        this.datos.tasa_fallos = (this.datos.num_fallos / this.datos.accesos).toFixed(2);
        this.datos.tasa_aciertos = (1 - this.datos.tasa_fallos).toFixed(2);
    }


    calc_tiempo_acceso_medio(){

        this.datos.t_medio = undefined;

        this.toggleHints();

        if(this.input_t_acierto.value === "" || this.input_t_fallo.value === "") return;

        this.datos.t_acierto = Number(this.input_t_acierto.value);
        this.datos.t_fallo = Number(this.input_t_fallo.value);

        if(isNaN(this.datos.t_acierto) || isNaN(this.datos.t_fallo)) return;

        this.datos.t_medio = 
            this.datos.tasa_aciertos * this.datos.t_acierto +
            this.datos.tasa_fallos * this.datos.t_fallo;

        this.renderTex();
    }


    toggleHints(){
        this.input_container.forEach( el => {
            el.style.setProperty('--display', (el.querySelector('input').value == "") ?'inline-block': 'none');
        });
    }


    renderTex(){

        this.formulas.forEach( formula => {
            switch(formula.getAttribute('data-formula')){
                case 'tasa_aciertos':
                    formula.innerHTML = `\\[ 
                        T_a = \\frac{N^o \\text{ aciertos}}{N^o \\text{ accesos}} =
                        \\frac{${this.datos.num_aciertos}}{${this.datos.accesos}} =
                        ${this.datos.tasa_aciertos}
                    \\]`;

                    break;

                case 'tasa_fallos':
                    formula.innerHTML = `\\[
                        T_f = \\frac{N^o \\text{ fallos}}{N^o \\text{ accesos}} =
                        \\frac{${this.datos.num_fallos}}{${this.datos.accesos}} =
                        ${this.datos.tasa_fallos} 
                    \\]`;

                    break;
                    
                case 'tiempo_medio':
                    if(this.datos.t_medio != undefined){
                        formula.innerHTML = `\\( 
                            t_m = T_f · t_f + T_a · t_a = 
                            ${this.datos.tasa_fallos} · ${this.datos.t_fallo} + ${this.datos.tasa_aciertos} · ${this.datos.t_acierto} =
                            ${this.datos.t_medio} 
                        \\)`;
                    }

                    break;
            }
        });
    
        
        new Promise(() => MathJax.typesetPromise());
    }
}







new cache();
new screenshot();


const select_politica = document.querySelector("select[name='tipo_asignacion']")
const cont_input_algorit = document.querySelector("div[data-input='algor_reemplazo']")

select_politica.onchange = (e) => {
    cont_input_algorit.setAttribute('data-visible', (e.target.value != 'ad'))
}