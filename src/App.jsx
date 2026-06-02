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

    const { data: clienteExistente, error: errorBuscarCliente } = await supabase
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
    height: "52px",
    padding: "0 15px",
    borderRadius: "14px",
    border: "1px solid rgba(212,175,55,0.36)",
    background: "rgba(255,255,255,0.97)",
    color: "#111827",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    color: "#f8fafc",
    fontSize: "14px",
    fontWeight: "800",
  };

  const fieldStyle = {
    marginBottom: "18px",
  };

  const cardGlass = {
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid rgba(212,175,55,0.23)",
    borderRadius: "24px",
    boxShadow: "0 28px 90px rgba(0,0,0,0.58)",
    backdropFilter: "blur(12px)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "34px 16px",
        background:
          "radial-gradient(circle at top left, rgba(212,175,55,0.26), transparent 32%), radial-gradient(circle at bottom right, rgba(212,175,55,0.12), transparent 38%), linear-gradient(rgba(2,6,23,0.88), rgba(2,6,23,0.97)), url('/logo.png') center/560px no-repeat fixed",
      }}
    >
      <main style={{ maxWidth: "1080px", margin: "0 auto" }}>
        <section
          style={{
            ...cardGlass,
            padding: "34px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr",
              gap: "28px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "190px",
                height: "190px",
                borderRadius: "50%",
                padding: "8px",
                margin: "0 auto",
                background:
                  "linear-gradient(135deg, #d4af37, rgba(255,255,255,0.18))",
                boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
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

            <div>
              <p
                style={{
                  color: "#d4af37",
                  fontWeight: "900",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                  fontSize: "13px",
                }}
              >
                Agenda online
              </p>

              <h1
                style={{
                  color: "white",
                  fontSize: "52px",
                  margin: 0,
                  lineHeight: "1",
                  letterSpacing: "-1.5px",
                }}
              >
                Barbería Alexis
              </h1>

              <p
                style={{
                  color: "#cbd5e1",
                  fontSize: "17px",
                  lineHeight: "1.6",
                  maxWidth: "620px",
                  marginTop: "14px",
                }}
              >
                Reserva tu cita de forma rápida. Elige el servicio, selecciona
                una fecha y toma uno de los horarios disponibles.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "16px",
                }}
              >
                <span
                  style={{
                    color: "#111827",
                    background: "#d4af37",
                    padding: "8px 12px",
                    borderRadius: "999px",
                    fontWeight: "900",
                    fontSize: "13px",
                  }}
                >
                  8:00 AM - 8:00 PM
                </span>

                <span
                  style={{
                    color: "#e5e7eb",
                    border: "1px solid rgba(255,255,255,0.22)",
                    padding: "8px 12px",
                    borderRadius: "999px",
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  Comida 2:00 PM - 3:00 PM
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "0.85fr 1.15fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <aside
            style={{
              ...cardGlass,
              padding: "28px",
            }}
          >
            <h2 style={{ color: "white", marginTop: 0, marginBottom: "18px" }}>
              Servicios
            </h2>

            <div style={{ display: "grid", gap: "14px" }}>
              {servicios.map((servicio) => {
                const activo = String(servicio.id) === String(servicioId);

                return (
                  <button
                    key={servicio.id}
                    onClick={() => setServicioId(String(servicio.id))}
                    style={{
                      textAlign: "left",
                      padding: "18px",
                      borderRadius: "18px",
                      border: activo
                        ? "1px solid #d4af37"
                        : "1px solid rgba(255,255,255,0.12)",
                      background: activo
                        ? "linear-gradient(135deg, rgba(212,175,55,0.22), rgba(212,175,55,0.06))"
                        : "rgba(255,255,255,0.05)",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <strong style={{ fontSize: "17px" }}>
                        {servicio.nombre}
                      </strong>
                      <strong style={{ color: "#d4af37", fontSize: "18px" }}>
                        ${servicio.precio}
                      </strong>
                    </div>

                    <div
                      style={{
                        color: "#cbd5e1",
                        fontSize: "13px",
                        marginTop: "7px",
                      }}
                    >
                      Duración: {servicio.duracion_minutos} minutos
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section
            style={{
              ...cardGlass,
              padding: "30px",
            }}
          >
            <h2 style={{ color: "white", marginTop: 0 }}>Agendar cita</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
              <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Servicio seleccionado</label>
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
                  <p
                    style={{
                      color: "#d4af37",
                      margin: "10px 0 0",
                      fontSize: "14px",
                      fontWeight: "800",
                    }}
                  >
                    {servicioSeleccionado.nombre} ·{" "}
                    {servicioSeleccionado.duracion_minutos} min · $
                    {servicioSeleccionado.precio}
                  </p>
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
                    opacity: !horarios.length ? 0.68 : 1,
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
                    height: "100px",
                    paddingTop: "13px",
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
                height: "56px",
                borderRadius: "16px",
                border: "none",
                background: "linear-gradient(135deg, #d4af37, #b88917)",
                color: "#111827",
                fontSize: "17px",
                fontWeight: "950",
                cursor: "pointer",
                marginTop: "6px",
                boxShadow: "0 15px 34px rgba(212,175,55,0.22)",
              }}
            >
              Reservar cita
            </button>
          </section>
        </section>
      </main>
    </div>
  );
}
