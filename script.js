class cache{


    constructor(){
        this.tipo_asignacion;
        this.algoritmo_reemplazo;
        this.direcciones = [];
        this.lineas_cache;
        this.palabras_por_bloque;
    
        this.cache = [];

        this.histFIFO = [];
        this.histLRU = [];
        this.histLFU = [];

        document.getElementById('btn_ejecutar').addEventListener('click', ()=>this.run());
        document.getElementById('btn_reset').addEventListener('click', ()=>this.reset());
    }


    run(){
        this.readData();
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
    }

    reset(){
        let tabla = document.getElementById('tabla');
       
        tabla.innerHTML =
            '<tr id="heading">'+
                '<th>Línea</th>'+
                '<th>Estado Inicial</th>'+
            '</tr>';

        
        this.readData();
        this.cache = [];
        this.histFIFO = [];
        this.histLRU = [];
        this.histLFU = [];
    }


    readData(){
        this.tipo_asignacion = document.querySelector('select[name="tipo_asignacion"]').value;
        this.algoritmo_reemplazo = document.querySelector('select[name="algoritmo_reemplazo"]').value;
        this.direcciones = document.querySelector('input[name="direcciones"]').value.replaceAll(' ', '').split(',').map(Number);
        this.lineas_cache = Number(document.querySelector('input[name="lineas_cache"]').value);
        this.palabras_por_bloque = Number(document.querySelector('input[name="palabras_por_bloque"]').value);
    }

    setupTable(){
        let tabla = document.getElementById('tabla');
        let dirInit = 0;

        //Borrado tabla
        this.reset();

        for (let i = 0; i < this.lineas_cache; i++) {

            //Asignación directa
            if(this.tipo_asignacion == 'ad'){
                //Generación columna
                tabla.insertAdjacentHTML('beforeend', 
                    '<tr>'+
                        `<td>${i}</td>`+
                        `<td class="col1">${i}:0 (${dirInit}-${dirInit+this.palabras_por_bloque-1})</td>`+
                    '</tr>'
                );

            //Asignación completamente asociativa
            }else if (this.tipo_asignacion == 'ca'){
                //Generación columna
                tabla.insertAdjacentHTML('beforeend', 
                    '<tr>'+
                        `<td>${i}</td>`+
                        `<td class="col1">${i} (${dirInit}-${dirInit+this.palabras_por_bloque-1})</td>`+
                    '</tr>'
                );
            }

            //Guardado de estado inicial de cache
            this.cache.push(this.rellenarRangoDirecciones(dirInit));
            dirInit += this.palabras_por_bloque;
        }

    }


    rellenarRangoDirecciones(inicio){
        let espacio = [];
        for (let i = inicio; i < inicio+this.palabras_por_bloque; i++) { espacio.push(i); }
        return espacio;
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
                this.tableAddColumn_AP(dir, newBloque, newEtiqueta, newLinea);
            }
        }
    }

    tableAddColumn_AP(dir, bloque, etiqueta, linea){

        //Filas tabla
        let filas = document.querySelectorAll('#tabla tr:not(#heading)');
        let numColumnas = document.querySelectorAll('#tabla th').length;
        let counter = 0;

        //Header
        document.getElementById('heading').insertAdjacentHTML('beforeend',`<th>Fallo: <b>${dir}</b></th>`);


        //Celdas de columna
        for (const fila of filas) {
            
            //Celda actualizada
            if (counter == linea){
                
                fila.insertAdjacentHTML('beforeend',
                    `<td class='col${numColumnas}' style="background-color:orange;">`+
                    `${bloque}:${etiqueta}`+
                    `(${this.cache[linea][0]}-`+
                    `${this.cache[linea].at(-1)})`+
                    `</td>`);

            //Celdas que no varian
            }else{
                fila.insertAdjacentHTML('beforeend',
                    `<td class='col${numColumnas}'>`+
                    document.querySelectorAll(`#tabla td.col${numColumnas-1}`)[counter].textContent+
                    `</td>`);
            }

            counter++;
        }

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
        
        for (const dir of this.direcciones) {

            console.log(this.histLRU);

            //Si la dirección NO ESTÁ en caché
            if(!this.dirInCache(dir)){

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
                        break
                    case 'lfu':
                        newLinea = this.histLFU.indexOf(Math.min(...this.histLFU));
                        this.histLFU[newLinea]++;
                    break;
                }
                
                //Se actualiza la caché
                this.cache[newLinea] = this.rellenarRangoDirecciones(primera_palabra_loque);

                //Se actualiza la tabla
                this.tableAddColumn_CA(dir, newBloque, newLinea);

                auxLRU = 0;

            //Si la dirección ESTÁ en caché   
            }else{

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
            }
        }
    }

    tableAddColumn_CA(dir, bloque, linea){

        //Filas tabla
        let filas = document.querySelectorAll('#tabla tr:not(#heading)');
        let numColumnas = document.querySelectorAll('#tabla th').length;
        let counter = 0;

        //Header
        document.getElementById('heading').insertAdjacentHTML('beforeend',`<th>Fallo: <b>${dir}</b></th>`);


        //Celdas de columna
        for (const fila of filas) {
            
            //Celda actualizada
            if (counter == linea){
                
                fila.insertAdjacentHTML('beforeend',
                    `<td class='col${numColumnas}' style="background-color:orange;">`+
                    +bloque+
                    ` (${this.cache[linea][0]}-`+
                    `${this.cache[linea].at(-1)})`+
                    `</td>`);

            //Celdas que no varian
            }else{
                fila.insertAdjacentHTML('beforeend',
                    `<td class='col${numColumnas}'>`+
                    document.querySelectorAll(`#tabla td.col${numColumnas-1}`)[counter].textContent+
                    `</td>`);
            }

            counter++;
        }

    }


    //Inicializa el historico de la cache para el algoritmo FIFO
    initFIFO(){
        for (let i = 0; i < this.lineas_cache; i++) { this.histFIFO.push(i); }
    }

    //Inicializa el historico de usos de la cache para el algoritmo LFU
    initLFU(){
        for (let i = 0; i < this.lineas_cache; i++) { this.histLFU.push(0); }
    }













    

    //Comprueba si la dirección dada está en la cache
    dirInCache(dir){
        for (const linea of this.cache) {
            if(linea.indexOf(dir) != -1){
                return true;
            }
        }

        return false;
    }

    //Busca la linea en la que está la dirección
    dirPosInCache(dir){
        for (const linea in this.cache) {
            if(this.cache[linea].indexOf(dir) != -1){
                return Number(linea);
            }
        }

        return -1;
    }

}


new cache();


const select_politica = document.querySelector("select[name='tipo_asignacion']")
const cont_input_algorit = document.querySelector("div[data-input='algor_reemplazo']")

select_politica.onchange = (e) => {
    cont_input_algorit.setAttribute('data-visible', (e.target.value == 'ad'))
}