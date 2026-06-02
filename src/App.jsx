import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [servicios, setServicios] = useState([]);
  const [servicioId, setServicioId] = useState("");
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [horarios, setHorarios] = useState([]);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [comentarios, setComentarios] = useState("");

  useEffect(() => {
    cargarServicios();
  }, []);

  useEffect(() => {
    generarHorarios();
  }, [servicioId, fecha, servicios]);

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

  async function generarHorarios() {
    if (!servicioId || !fecha) {
      setHorarios([]);
      return;
    }

    const servicio = servicios.find(
      (s) => String(s.id) === String(servicioId)
    );

    if (!servicio) return;

    const duracion = servicio.duracion_minutos;
    const apertura = convertirMinutos("08:00");
    const cierre = convertirMinutos("20:00");
    const comidaInicio = convertirMinutos("14:00");
    const comidaFin = convertirMinutos("15:00");

    const { data: citasExistentes } = await supabase
      .from("citas")
      .select("hora_inicio")
      .eq("fecha", fecha)
      .eq("estado", "confirmada");

    const horasOcupadas =
      citasExistentes?.map((c) => c.hora_inicio.substring(0, 5)) || [];

    const lista = [];

    for (let inicio = apertura; inicio + duracion <= cierre; inicio += 45) {
      const fin = inicio + duracion;
      const cruzaComida = inicio < comidaFin && fin > comidaInicio;
      const horaTexto = convertirHora(inicio);
      const ocupado = horasOcupadas.includes(horaTexto);

      if (!cruzaComida && !ocupado) {
        lista.push({
          inicio: horaTexto,
          fin: convertirHora(fin),
        });
      }
    }

    setHorarios(lista);
    setHorario("");
  }

  async function reservarCita() {
    if (!servicioId || !fecha || !horario || !nombre || !telefono) {
      alert("Completa todos los campos obligatorios");
      return;
    }

    const { data: citaExistente } = await supabase
      .from("citas")
      .select("id")
      .eq("fecha", fecha)
      .eq("hora_inicio", horario)
      .eq("estado", "confirmada")
      .maybeSingle();

    if (citaExistente) {
      alert("⚠️ Ese horario ya fue reservado");
      return;
    }

    const servicio = servicios.find(
      (s) => String(s.id) === String(servicioId)
    );

    const horaFin = convertirHora(
      convertirMinutos(horario) + servicio.duracion_minutos
    );

    let clienteId = null;

    const { data: clienteExistente } = await supabase
      .from("clientes")
      .select("*")
      .eq("telefono", telefono)
      .maybeSingle();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: nuevoCliente, error: errorCliente } = await supabase
        .from("clientes")
        .insert([{ nombre, telefono }])
        .select()
        .single();

      if (errorCliente) {
        alert("Error creando cliente: " + errorCliente.message);
        return;
      }

      clienteId = nuevoCliente.id;
    }

    const { error: errorCita } = await supabase.from("citas").insert([
      {
        cliente_id: clienteId,
        servicio_id: Number(servicioId),
        fecha,
        hora_inicio: horario,
        hora_fin: horaFin,
        estado: "confirmada",
        comentarios,
      },
    ]);

    if (errorCita) {
      alert("Error guardando cita: " + errorCita.message);
      return;
    }

    alert("✅ Tu cita quedó reservada correctamente");

    setServicioId("");
    setFecha("");
    setHorario("");
    setNombre("");
    setTelefono("");
    setComentarios("");
    setHorarios([]);
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: "620px", margin: "40px auto" }}>
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <div style={{ fontSize: "48px" }}>💈</div>
          <h1 style={{ margin: "5px 0" }}>Barbería Alexis</h1>
          <p style={{ color: "#cbd5e1" }}>
            Agenda tu cita de forma rápida y sencilla
          </p>
        </div>

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
        <select
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          disabled={!horarios.length}
        >
          <option value="">Selecciona un horario</option>
          {horarios.map((h) => (
            <option key={h.inicio} value={h.inicio}>
              {h.inicio} - {h.fin}
            </option>
          ))}
        </select>

        <label>Nombre</label>
        <input
          placeholder="Tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <label>Teléfono</label>
        <input
          placeholder="Tu teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />

        <label>Comentarios</label>
        <textarea
          placeholder="Ej. degradado bajo, barba completa, etc."
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px",
            borderRadius: "6px",
            border: "none",
            resize: "vertical",
            minHeight: "80px",
          }}
        />

        <button onClick={reservarCita}>
          Reservar cita
        </button>
      </div>
    </div>
  );
}
