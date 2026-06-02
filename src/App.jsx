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

    const servicio = servicios.find((s) => String(s.id) === String(servicioId));
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

    const servicio = servicios.find((s) => String(s.id) === String(servicioId));
    const horaInicioMin = convertirMinutos(horario);
    const horaFin = convertirHora(horaInicioMin + servicio.duracion_minutos);
    const horaFinMin = convertirMinutos(horaFin);

    const { data: citasExistentes } = await supabase
      .from("citas")
      .select("id, hora_inicio, hora_fin")
      .eq("fecha", fecha)
      .eq("estado", "confirmada");

    const existeEmpalme = (citasExistentes || []).some((cita) => {
      const inicioExistente = convertirMinutos(cita.hora_inicio.substring(0, 5));
      const finExistente = convertirMinutos(cita.hora_fin.substring(0, 5));
      return horaInicioMin < finExistente && horaFinMin > inicioExistente;
    });

    if (existeEmpalme) {
      alert("⚠️ Ese horario acaba de ser reservado. Elige otro horario.");
      await generarHorarios();
      return;
    }

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

  const inputStyle = {
    width: "100%",
    height: "48px",
    padding: "0 14px",
    borderRadius: "12px",
    border: "1px solid rgba(212, 175, 55, 0.35)",
    background: "rgba(255,255,255,0.96)",
    color: "#111827",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontWeight: "700",
    color: "#f8fafc",
    fontSize: "14px",
  };

  const fieldStyle = {
    marginBottom: "18px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "36px 16px",
        background:
          "radial-gradient(circle at top, rgba(212,175,55,0.18), transparent 35%), linear-gradient(rgba(2,6,23,0.86), rgba(2,6,23,0.96)), url('/logo.png') center/520px no-repeat fixed",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "1px",
          borderRadius: "26px",
          background:
            "linear-gradient(135deg, rgba(212,175,55,0.85), rgba(255,255,255,0.08), rgba(212,175,55,0.35))",
          boxShadow: "0 28px 90px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            borderRadius: "25px",
            padding: "34px",
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "34px" }}>
            <div
              style={{
                width: "170px",
                height: "170px",
                margin: "0 auto 16px",
                borderRadius: "50%",
                padding: "8px",
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.95), rgba(255,255,255,0.18))",
                boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
              }}
            >
              <img
                src="/logo.png"
                alt="Barbería Alexis"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                  display: "block",
                }}
              />
            </div>

            <h1
              style={{
                margin: "0",
                fontSize: "42px",
                lineHeight: "1.05",
                color: "#ffffff",
                letterSpacing: "-1px",
              }}
            >
              Barbería Alexis
            </h1>

            <p
              style={{
                margin: "10px auto 0",
                color: "#cbd5e1",
                maxWidth: "430px",
                fontSize: "15px",
              }}
            >
              Reserva tu cita en línea. Elige servicio, fecha y horario disponible.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "18px",
            }}
          >
            <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Servicio</label>
              <select
                value={servicioId}
                onChange={(e) => setServicioId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Selecciona un servicio</option>
                {servicios.map((servicio) => (
                  <option key={servicio.id} value={servicio.id}>
                    {servicio.nombre} - ${servicio.precio}
                  </option>
                ))}
              </select>

              {servicioSeleccionado && (
                <div
                  style={{
                    marginTop: "10px",
                    color: "#d4af37",
                    fontSize: "14px",
                    fontWeight: "700",
                  }}
                >
                  Duración: {servicioSeleccionado.duracion_minutos} min · Precio: $
                  {servicioSeleccionado.precio}
                </div>
              )}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Horario disponible</label>
              <select
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                disabled={!horarios.length}
                style={{
                  ...inputStyle,
                  opacity: !horarios.length ? 0.65 : 1,
                }}
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
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Nombre</label>
              <input
                placeholder="Ej. Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Teléfono</label>
              <input
                placeholder="Ej. 5512345678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Comentarios</label>
              <textarea
                placeholder="Ej. degradado bajo, barba completa, corte para niño..."
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                style={{
                  ...inputStyle,
                  height: "96px",
                  paddingTop: "12px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          <button
            onClick={reservarCita}
            style={{
              width: "100%",
              height: "54px",
              borderRadius: "14px",
              border: "none",
              background:
                "linear-gradient(135deg, #d4af37, #b88917)",
              color: "#111827",
              fontSize: "17px",
              fontWeight: "900",
              cursor: "pointer",
              marginTop: "8px",
              boxShadow: "0 12px 28px rgba(212,175,55,0.22)",
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
            Horario: 8:00 AM a 8:00 PM · Comida: 2:00 PM a 3:00 PM
          </p>
        </div>
      </div>
    </div>
  );
}
