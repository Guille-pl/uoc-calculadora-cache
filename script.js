class cache{

    constructor(){
        this.tipo_asignacion;
        this.algoritmo_reemplazo;
        this.direcciones = [];
        this.lineas_cache;
        this.palabras_por_bloque;
        this.num_conjuntos;
        this.contenedor_tabla;
        this.tabla;
        this.btn_copiar;
        this.formulas;

        this.calculos = this.definirCalculos();
    
        this.cache = [];

        this.histFIFO = [];
        this.histLRU = [];
        this.histLFU = [];

        document.querySelector('button[data-btn="iniciar"]').addEventListener('click', ()=>this.init());
        document.querySelector('button[data-btn="reset"]').addEventListener('click', ()=>this.reset());
    }


    init(){
        this.readData();
        this.reset();
        this.setupTable();

        const step = document.createElement('div');

        step.setAttribute('class', 'step');
        step.addEventListener('click', ()=>{
            this.run();
            step.remove();
        });
        step.innerHTML = `<p>¡ Actualiza el estado inicial de la cache ahora que puedes ! <br><br> Y ahora...</p><button>Ejecutar</button>`;

        this.contenedor_tabla.appendChild(step);
        this.contenedor_tabla.toggleAttribute('data-incomplete');
    }


    run(){
        this.aplicarEstadoInicial();

        switch(this.tipo_asignacion){
            case 'ad':
                this.asignacionDirecta();
                break;
            case 'ca':
            case 'apc':
                this.asignacionAsociativa();
                break;
        }

        this.contenedor_tabla.removeAttribute('data-incomplete');
        this.btn_copiar.setAttribute('data-visible', true);
        this.formulas.setAttribute('data-visible', true);

        new math();
    }


    reset(){
        const step = this.contenedor_tabla.querySelector('.step');
        if(step != null){step.remove();}

        this.tabla.innerHTML = '';
        this.cache.length = this.histFIFO.length =
        this.histLRU.length = this.histLFU.length = 0;
        this.btn_copiar.setAttribute('data-visible', false);
        this.formulas.setAttribute('data-visible', false);
        this.contenedor_tabla.removeAttribute('data-incomplete');
    }


    readData(){
        this.contenedor_tabla = document.querySelector('#contenedor_tabla');
        this.tabla = contenedor_tabla.querySelector('table');
        this.btn_copiar = document.querySelector('#copiar_trabla');
        this.formulas = document.querySelector('#formulas');

        this.tipo_asignacion = document.querySelector('select[name="tipo_asignacion"]').value;
        this.algoritmo_reemplazo = document.querySelector('select[name="algoritmo_reemplazo"]').value;
        this.direcciones = document.querySelector('input[name="direcciones"]').value.replaceAll(' ', '').split(',').map(Number);
        this.lineas_cache = Number(document.querySelector('input[name="lineas_cache"]').value);
        this.palabras_por_bloque = Number(document.querySelector('input[name="palabras_por_bloque"]').value);
        this.num_conjuntos = Number(document.querySelector('input[name="num_conjuntos"]').value);
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

            estadoInicial = this.selectorEstadoInicial(dirInit);
                
            this.tabla.insertAdjacentHTML('beforeend', 
                `<tr>
                    <td>${i}</td>
                    <td class="col1">${estadoInicial}</td>
                </tr>`
            );

            dirInit += this.palabras_por_bloque;
        }
    }


    aplicarEstadoInicial(){
        let res;
        let dirInit;
        const selectores = this.tabla.querySelectorAll('select');

        selectores.forEach( (sel, index) => {
            dirInit = Number(sel.value);

            if(this.tipo_asignacion != 'apc' || isNaN(dirInit)){
                sel.parentNode.innerHTML = sel.options[sel.selectedIndex].text;
            
            }else{
                res = this.calculos.calcAPC.bind(this)(dirInit);
                sel.parentNode.innerHTML = `${sel.options[sel.selectedIndex].text}<br> <i>conjunto ${res.newConjunto}</i>`; 
            }

            //Guardado de estado inicial de cache
            this.cache.push(this.rellenarRangoDirecciones(dirInit));
        });
    }



    /* *************************************************** */
    /* **************** Asignación Directa *************** */
    /* *************************************************** */

    asignacionDirecta(){
        
        let res;
        
        for (const dir of this.direcciones) {

            //Si la dirección ESTÁ en cache, no se hace nada
            if(this.dirInCache(dir)) continue;

            res = this.calculos.calcAP.bind(this)(dir);

            //Se actualiza la caché
            this.cache[res.newLinea] = this.rellenarRangoDirecciones(res.primera_palabra_bloque);

            //Se actualiza la tabla
            this.tableAddColumn(dir, res.newLinea, res.newBloque, res.newEtiqueta);
        }
    }


    /* *************************************************** */
    /********* Asignación Completamente Asociativa ******* */
    /*********                  &                  ******* */
    /********* Asignación Asociativa por Conjuntos ******* */
    /* *************************************************** */

    asignacionAsociativa(){

        let res;

        this.histLRU = [];
        this.initFIFO();
        this.initLFU();
        
        this.direcciones.forEach ( dir => {
            
            // -------- Si la dirección ESTÁ en cache 
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

            

            // -------- Si la dirección NO ESTÁ en cache
            switch(this.tipo_asignacion){
                case 'ca':
                    res = this.calculos.calcCA.bind(this)(dir, true);
                    
                    //Se actualiza la cache
                    this.cache[res.newLinea] = this.rellenarRangoDirecciones(res.primera_palabra_bloque);
            
                    //Se actualiza la tabla
                    this.tableAddColumn(dir, res.newLinea, res.newBloque);

                    break;
                case 'apc':
                    res = this.calculos.calcAPC.bind(this)(dir, true);
                    
                    //Se actualiza la cache
                    this.cache[res.newLinea] = this.rellenarRangoDirecciones(res.primera_palabra_bloque);
            
                    //Se actualiza la tabla
                    this.tableAddColumn(dir, res.newLinea, res.newBloque, res.newEtiqueta, res.newConjunto);
                    break;
            }
        });
    }


    /* *************************************************** */
    /* **************** Métodos auxiliares *************** */
    /* *************************************************** */

    definirCalculos(){
        return {
            calcAP(dir){
                const newBloque = Math.trunc(dir/this.palabras_por_bloque);

                return {
                    newBloque: newBloque,
                    newEtiqueta: Math.trunc(newBloque/this.lineas_cache),
                    newLinea: newBloque % this.lineas_cache,
                    primera_palabra_bloque: newBloque * this.palabras_por_bloque,
                }
            },
            calcCA(dir, calcular=false){
                let auxLRU = 0;
                let newLinea = 0;
                let linea_accedida_LRU;
                const newBloque = Math.trunc(dir/this.palabras_por_bloque);

                if(!calcular){
                    return {
                        newBloque: newBloque,
                        primera_palabra_bloque: newBloque * this.palabras_por_bloque,
                    }
                }
                //Cálculo de la linea de la caché en función del algoritmo de reemplazo
                switch(this.algoritmo_reemplazo){
                    case 'fifo':
                        newLinea = this.histFIFO.indexOf(0);
                        this.histFIFO = this.histFIFO.map(elem => elem - 1);
                        this.histFIFO[newLinea] = this.lineas_cache-1;
                        break;

                    case 'lru':
                        for (let i = 0; i < this.lineas_cache; i++) {

                            linea_accedida_LRU = this.histLRU.indexOf(i);

                            //No se ha accedido a la linea todavía
                            if(linea_accedida_LRU == -1){
                                newLinea = i;
                                break;
                            //Se ha accedido a la linea
                            }else if(linea_accedida_LRU > auxLRU){
                                auxLRU = linea_accedida_LRU;
                                newLinea = this.histLRU[auxLRU];
                            }
                        }

                        this.histLRU.unshift(newLinea);
                        break;

                    case 'lfu':
                        newLinea = this.histLFU.indexOf(Math.min(...this.histLFU));
                        this.histLFU[newLinea]++;
                    break;
                }

                return {
                    newBloque: newBloque,
                    newLinea: newLinea,
                    primera_palabra_bloque: newBloque * this.palabras_por_bloque,
                }
            },
            calcAPC(dir, calcular=false){
                let auxLRU = 0;
                let newLinea = 0;
                let linea_accedida_LRU;
                const newBloque = Math.trunc(dir / this.palabras_por_bloque);

                if(!calcular){
                    return {
                        newBloque: newBloque,
                        newEtiqueta: Math.trunc(newBloque / this.num_conjuntos),
                        newConjunto: newBloque % this.num_conjuntos,
                        primera_palabra_bloque: newBloque * this.palabras_por_bloque,
                    }
                }
                //Cálculo de la linea de la caché en función del algoritmo de reemplazo
                switch(this.algoritmo_reemplazo){
                    case 'fifo':
                        newLinea = this.histFIFO.indexOf(0);
                        this.histFIFO = this.histFIFO.map(elem => elem - 1);
                        this.histFIFO[newLinea] = this.lineas_cache-1;
                        break;

                    case 'lru':
                        for (let i = 0; i < this.lineas_cache; i++) {

                            linea_accedida_LRU = this.histLRU.indexOf(i);

                            //No se ha accedido a la linea todavía
                            if(linea_accedida_LRU == -1){
                                newLinea = i;
                                break;
                            //Se ha accedido a la linea
                            }else if(linea_accedida_LRU > auxLRU){
                                auxLRU = linea_accedida_LRU;
                                newLinea = this.histLRU[auxLRU];
                            }
                        }

                        this.histLRU.unshift(newLinea);
                        break;

                    case 'lfu':
                        newLinea = this.histLFU.indexOf(Math.min(...this.histLFU));
                        this.histLFU[newLinea]++;
                    break;
                }

                return {
                    newBloque: newBloque,
                    newEtiqueta: Math.trunc(newBloque / this.num_conjuntos),
                    newConjunto: newBloque % this.num_conjuntos,
                    newLinea: newLinea,
                    primera_palabra_bloque: newBloque * this.palabras_por_bloque,
                }
            }
        }
    }

    //Impresión de celdas de cache
    tableAddColumn(dir, linea, bloque, etiqueta="", conjunto=""){

        let cellContent;
        let counter = 0;
        const filas = this.tabla.querySelectorAll('tr:not(#heading)');
        const numColumnas = this.tabla.querySelectorAll('th').length;
        const columnas = this.tabla.querySelectorAll(`td.col${numColumnas-1}`);

        //Header
        this.printHeader(numColumnas, dir);


        //Celdas de columna
        filas.forEach( fila => {

            //Celdas que no varian
            if (counter != linea){
                cellContent = columnas[counter].innerHTML;

            //Celda actualizada
            }else{
                cellContent = ` (${this.cache[linea][0]}-${this.cache[linea].at(-1)})`;
    
                switch(this.tipo_asignacion){
                    case 'ad':
                        cellContent = `${bloque}:${etiqueta}` + cellContent;
                        break;
    
                    case 'ca':
                        cellContent = bloque + cellContent;
                        break;
                        
                    case 'apc':
                        cellContent = `${bloque}:${etiqueta}${cellContent} <br> <i>conjunto ${conjunto}</i>`;
                        break;
                }
            }
            
            
            fila.insertAdjacentHTML('beforeend',
                `<td class='col${numColumnas} ${(counter == linea)? 'highlight' : ''}'>
                    ${cellContent}
                </td>`
            );

            counter++;
        });

    }


    //Genera selectores para seleccionar estado inicial
    //Dado que no nos especifican el tamaño de la memoria, asumiremos que tiene espacio para almacenar 20 bloques
    selectorEstadoInicial(dirInit){
                
        let res;
        let selector = `<select name="direcciones-linea">
            <option value="false">Vacío</option>`;

        
        for(let dir = 0; dir < this.palabras_por_bloque*20; dir+=this.palabras_por_bloque){

            switch(this.tipo_asignacion){
                case 'ad':
                    res = this.calculos.calcAP.bind(this)(dir);
        
                    selector += `<option value="${dir}" ${(dirInit == dir)? "selected" : ""}>
                        ${res.newBloque}:${res.newEtiqueta} (${dir}-${dir+this.palabras_por_bloque-1})
                    </option>`;
                    break;

                case 'ca':
                    res = this.calculos.calcCA.bind(this)(dir);

                    selector += `<option value="${dir}" ${(dirInit == dir)? "selected" : ""}>
                        ${res.newBloque} (${dir}-${dir+this.palabras_por_bloque-1})
                    </option>`;
                    break;
                    
                case 'apc':
                    res = this.calculos.calcAPC.bind(this)(dir);
                    
                    selector += `<option value="${dir}" ${(dirInit == dir)? "selected" : ""}>
                        ${res.newBloque}:${res.newEtiqueta} (${dir}-${dir+this.palabras_por_bloque-1})
                    </option>`;
                    break;
            }
        }
        
        selector += `</select>`;

        return selector;
    }

    //Inicializa las direcciones almacenadas en cache por defecto
    rellenarRangoDirecciones(inicio){
        return [...Array(this.palabras_por_bloque).keys()].map(x => x+inicio);
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
        for (let linea of this.cache) {
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
            html2canvas(this.formattedTabla, {sacle:1}).then(canvas => {
                const enlace = document.createElement('a');
                enlace.download = "Cache Screenshot";
                enlace.href = canvas.toDataURL();
                enlace.click();
                res();
            });
        });
    }
}




class math{

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
const cont_input_num_conjuntos = document.querySelector("div[data-input='num_conjuntos']")

select_politica.onchange = (e) => {
    cont_input_algorit.setAttribute('data-visible', (e.target.value != 'ad'));
    cont_input_num_conjuntos.setAttribute('data-visible', (e.target.value == 'apc'));
}