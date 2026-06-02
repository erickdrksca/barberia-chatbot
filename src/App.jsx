import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [servicios, setServicios] = useState([]);
  const [servicioId, setServicioId] = useState("");
  const [fecha, setFecha] = useState("");
  const [horarios, setHorarios] = useState([]);

  useEffect(() => {
    cargarServicios();
  }, []);

  useEffect(() => {
    generarHorarios();
  }, [servicioId, fecha]);

  async function cargarServicios() {
    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .eq("activo", true)
      .order("id", { ascending: true });

    if (error) {
      alert(JSON.stringify(error));
      return;
    }

    setServicios(data);
  }

  function convertirMinutos(hora) {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
  }

  function convertirHora(minutos) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function generarHorarios() {
    if (!servicioId || !fecha) {
      setHorarios([]);
      return;
    }

    const servicio = servicios.find((s) => String(s.id) === String(servicioId));
    if (!servicio) return;

    const duracion = servicio.duracion_minutos;

    const apertura = convertirMinutos("08:00");
    const cierre = convertirMinutos("20:00");
    const comidaInicio = convertirMinutos("14:00");
    const comidaFin = convertirMinutos("15:00");

    const lista = [];

    for (let inicio = apertura; inicio + duracion <= cierre; inicio += 45) {
      const fin = inicio + duracion;

      const cruzaComida = inicio < comidaFin && fin > comidaInicio;

      if (!cruzaComida) {
        lista.push({
          inicio: convertirHora(inicio),
          fin: convertirHora(fin),
        });
      }
    }

    setHorarios(lista);
  }

  return (
    <div className="container">
      <h1>💈 Barbería Chat</h1>

      <div className="card">
        <h2>Agendar cita</h2>

        <label>Servicio</label>
        <select value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
          <option value="">Selecciona un servicio</option>
          {servicios.map((servicio) => (
            <option key={servicio.id} value={servicio.id}>
              {servicio.nombre} - ${servicio.precio}
            </option>
          ))}
        </select>

        <label>Fecha</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />

        <label>Horario</label>
        <select disabled={!horarios.length}>
          <option value="">Selecciona un horario</option>
          {horarios.map((h) => (
            <option key={h.inicio} value={h.inicio}>
              {h.inicio} - {h.fin}
            </option>
          ))}
        </select>

        <input placeholder="Nombre" />
        <input placeholder="Teléfono" />

        <button>Reservar</button>
      </div>
    </div>
  );
}
