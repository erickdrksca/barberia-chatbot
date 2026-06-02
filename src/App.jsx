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
      alert("Error cargando servicios: " + error.message);
      return;
    }

    setServicios(data || []);
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
      setHorario("");
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

    const { data: citasExistentes, error } = await supabase
      .from("citas")
      .select("hora_inicio, hora_fin")
      .eq("fecha", fecha)
      .eq("estado", "confirmada");

    if (error) {
      alert("Error consultando horarios: " + error.message);
      return;
    }

    const citasOcupadas =
      citasExistentes?.map((cita) => ({
        inicio: convertirMinutos(cita.hora_inicio.substring(0, 5)),
        fin: convertirMinutos(cita.hora_fin.substring(0, 5)),
      })) || [];

    const lista = [];

    for (let inicio = apertura; inicio + duracion <= cierre; inicio += 45) {
      const fin = inicio + duracion;

      const cruzaComida = inicio < comidaFin && fin > comidaInicio;

      const seEmpalma = citasOcupadas.some(
        (cita) => inicio < cita.fin && fin > cita.inicio
      );

      if (!cruzaComida && !seEmpalma) {
        lista.push({
          inicio: convertirHora(inicio),
          fin: convertirHora(fin),
        });
      }
    }

    setHorarios(lista);
    setHorario("");
  }

  async function reservarCita() {
    if (!servicioId || !fecha || !horario || !nombre || !telefono) {
      alert("Completa servicio, fecha, horario, nombre y teléfono.");
      return;
    }

    const servicio = servicios.find(
      (s) => String(s.id) === String(servicioId)
    );

    if (!servicio) {
      alert("Selecciona un servicio válido.");
      return;
    }

    const horaInicioMin = convertirMinutos(horario);
    const horaFin = convertirHora(horaInicioMin + servicio.duracion_minutos);
    const horaFinMin = convertirMinutos(horaFin);

    const { data: citasExistentes, error: errorValidacion } = await supabase
      .from("citas")
      .select("id, hora_inicio, hora_fin")
      .eq("fecha", fecha)
      .eq("estado", "confirmada");

    if (errorValidacion) {
      alert("Error validando horario: " + errorValidacion.message);
      return;
    }

    const existeEmpalme = (citasExistentes || []).some((cita) => {
      const inicioExistente = convertirMinutos(
        cita.hora_inicio.substring(0, 5)
      );
      const finExistente = convertirMinutos(cita.hora_fin.substring(0, 5));

      return horaInicioMin < finExistente && horaFinMin > inicioExistente;
    });

    if (existeEmpalme) {
      alert("⚠️ Ese horario acaba de ser reservado. Elige otro horario.");
      await generarHorarios();
      return;
    }

    let clienteId = null;

    const { data: clienteExistente, error: errorBuscarCliente } =
      await supabase
        .from("clientes")
        .select("*")
        .eq("telefono", telefono)
        .maybeSingle();

    if (errorBuscarCliente) {
      alert("Error buscando cliente: " + errorBuscarCliente.message);
      return;
    }

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: nuevoCliente, error: errorCliente } = await supabase
        .from("clientes")
        .insert([
          {
            nombre,
            telefono,
          },
        ])
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
        comentarios: comentarios || null,
      },
    ]);

    if (errorCita) {
      alert("Error guardando cita: " + errorCita.message);
      return;
    }

    alert("✅ Tu cita quedó reservada correctamente.");

    setServicioId("");
    setFecha("");
    setHorario("");
    setNombre("");
    setTelefono("");
    setComentarios("");
    setHorarios([]);
  }

  const servicioSeleccionado = servicios.find(
    (s) => String(s.id) === String(servicioId)
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.94)), url('/logo.png') center/420px no-repeat fixed",
        padding: "30px 16px",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          borderRadius: "18px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img
            src="/logo.png"
            alt="Barbería Alexis"
            style={{
              width: "165px",
              height: "165px",
              objectFit: "contain",
              marginBottom: "8px",
            }}
          />

          <h1 style={{ margin: "0 0 6px", fontSize: "38px" }}>
            Barbería Alexis
          </h1>

          <p style={{ color: "#cbd5e1", margin: 0 }}>
            Agenda tu cita en línea de forma rápida y sencilla
          </p>
        </div>

        <h2 style={{ marginBottom: "18px" }}>Agendar cita</h2>

        <label>Servicio</label>
        <select
          value={servicioId}
          onChange={(e) => setServicioId(e.target.value)}
        >
          <option value="">Selecciona un servicio</option>

          {servicios.map((servicio) => (
            <option key={servicio.id} value={servicio.id}>
              {servicio.nombre} - ${servicio.precio}
            </option>
          ))}
        </select>

        {servicioSeleccionado && (
          <p style={{ color: "#cbd5e1", margin: "8px 0 0" }}>
            Duración: {servicioSeleccionado.duracion_minutos} minutos
          </p>
        )}

        <label>Fecha</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />

        <label>Horario disponible</label>
        <select
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          disabled={!horarios.length}
        >
          <option value="">
            {servicioId && fecha
              ? horarios.length
                ? "Selecciona un horario"
                : "No hay horarios disponibles"
              : "Selecciona servicio y fecha"}
          </option>

          {horarios.map((h) => (
            <option key={h.inicio} value={h.inicio}>
              {h.inicio} - {h.fin}
            </option>
          ))}
        </select>

        <label>Nombre</label>
        <input
          placeholder="Ej. Juan Pérez"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <label>Teléfono</label>
        <input
          placeholder="Ej. 5512345678"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />

        <label>Comentarios</label>
        <textarea
          placeholder="Ej. degradado bajo, barba completa, corte para niño..."
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          style={{
            width: "100%",
            minHeight: "90px",
            padding: "12px",
            marginTop: "10px",
            borderRadius: "8px",
            border: "none",
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />

        <button
          onClick={reservarCita}
          style={{
            marginTop: "18px",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          Reservar cita
        </button>

        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "13px",
            marginTop: "18px",
          }}
        >
          Horario de atención: 8:00 AM a 8:00 PM · Comida: 2:00 PM a 3:00 PM
        </p>
      </div>
    </div>
  );
}
