import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [servicios, setServicios] = useState([]);
  const [citas, setCitas] = useState([]);

  const [servicioId, setServicioId] = useState("");
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [horarios, setHorarios] = useState([]);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    cargarServicios();
    cargarCitas();
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

  async function cargarCitas() {
    const { data, error } = await supabase
      .from("citas")
      .select(`
        *,
        clientes (
          nombre,
          telefono
        ),
        servicios (
          nombre,
          precio
        )
      `)
      .order("fecha", { ascending: true });

    if (error) {
      console.log(error);
      return;
    }

    setCitas(data);
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
      .eq("fecha", fecha);

    const horasOcupadas =
      citasExistentes?.map((c) =>
        c.hora_inicio.substring(0, 5)
      ) || [];

    const lista = [];

    for (
      let inicio = apertura;
      inicio + duracion <= cierre;
      inicio += 45
    ) {
      const fin = inicio + duracion;

      const cruzaComida =
        inicio < comidaFin &&
        fin > comidaInicio;

      const horaTexto = convertirHora(inicio);

      const ocupado =
        horasOcupadas.includes(horaTexto);

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
    if (
      !servicioId ||
      !fecha ||
      !horario ||
      !nombre ||
      !telefono
    ) {
      alert("Completa todos los campos");
      return;
    }

    const { data: citaExistente } =
      await supabase
        .from("citas")
        .select("id")
        .eq("fecha", fecha)
        .eq("hora_inicio", horario)
        .maybeSingle();

    if (citaExistente) {
      alert("⚠️ Ese horario ya fue reservado");
      return;
    }

    const servicio = servicios.find(
      (s) => String(s.id) === String(servicioId)
    );

    const horaFin = convertirHora(
      convertirMinutos(horario) +
      servicio.duracion_minutos
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
      const {
        data: nuevoCliente,
        error: errorCliente,
      } = await supabase
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
        alert(
          "Error creando cliente: " +
            errorCliente.message
        );
        return;
      }

      clienteId = nuevoCliente.id;
    }

    const { error: errorCita } =
      await supabase
        .from("citas")
        .insert([
          {
            cliente_id: clienteId,
            servicio_id: Number(servicioId),
            fecha,
            hora_inicio: horario,
            hora_fin: horaFin,
            estado: "confirmada",
          },
        ]);

    if (errorCita) {
      alert(
        "Error guardando cita: " +
          errorCita.message
      );
      return;
    }

    await cargarCitas();
    await generarHorarios();

    alert("✅ Cita reservada correctamente");

    setServicioId("");
    setFecha("");
    setHorario("");
    setNombre("");
    setTelefono("");
    setHorarios([]);
  }

  return (
    <div className="container">
      <h1>💈 Barbería Chat</h1>

      <div className="card">
        <h2>Agendar cita</h2>

        <label>Servicio</label>

        <select
          value={servicioId}
          onChange={(e) =>
            setServicioId(e.target.value)
          }
        >
          <option value="">
            Selecciona un servicio
          </option>

          {servicios.map((servicio) => (
            <option
              key={servicio.id}
              value={servicio.id}
            >
              {servicio.nombre} - $
              {servicio.precio}
            </option>
          ))}
        </select>

        <label>Fecha</label>

        <input
          type="date"
          value={fecha}
          onChange={(e) =>
            setFecha(e.target.value)
          }
        />

        <label>Horario</label>

        <select
          value={horario}
          onChange={(e) =>
            setHorario(e.target.value)
          }
          disabled={!horarios.length}
        >
          <option value="">
            Selecciona un horario
          </option>

          {horarios.map((h) => (
            <option
              key={h.inicio}
              value={h.inicio}
            >
              {h.inicio} - {h.fin}
            </option>
          ))}
        </select>

        <input
          placeholder="Nombre"
          value={nombre}
          onChange={(e) =>
            setNombre(e.target.value)
          }
        />

        <input
          placeholder="Teléfono"
          value={telefono}
          onChange={(e) =>
            setTelefono(e.target.value)
          }
        />

        <button onClick={reservarCita}>
          Reservar
        </button>
      </div>

      <div
        className="card"
        style={{ marginTop: "30px" }}
      >
        <h2>📅 Agenda de citas</h2>

        <table
          style={{
            width: "100%",
            background: "white",
            color: "black",
          }}
        >
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Servicio</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {citas.map((cita) => (
              <tr key={cita.id}>
                <td>{cita.fecha}</td>
                <td>{cita.hora_inicio}</td>
                <td>{cita.clientes?.nombre}</td>
                <td>{cita.clientes?.telefono}</td>
                <td>{cita.servicios?.nombre}</td>
                <td>{cita.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
