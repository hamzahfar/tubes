'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { userApi } from '@/lib/api';

// --- GRAPHQL QUERIES & MUTATIONS ---
const GET_ACADEMIC_DATA = gql`
  query GetAcademicData {
    courses {
      id
      code
      name
      lecturer
      day
      time
    }
    assignments {
      id
      title
      deadline
      status
      course {
        name
      }
    }
  }
`;

const ADD_COURSE = gql`
  mutation AddCourse($code: String!, $name: String!, $lecturer: String!, $day: String!, $time: String!) {
    addCourse(code: $code, name: $name, lecturer: $lecturer, day: $day, time: $time) {
      id
      name
    }
  }
`;

const ADD_ASSIGNMENT = gql`
  mutation AddAssignment($courseId: ID!, $title: String!, $deadline: String!) {
    addAssignment(courseId: $courseId, title: $title, deadline: $deadline) {
      id
      title
      status
    }
  }
`;

const UPDATE_ASSIGNMENT_STATUS = gql`
  mutation UpdateStatus($id: ID!, $status: String!) {
    updateAssignmentStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

const DELETE_ASSIGNMENT = gql`
  mutation DeleteAssignment($id: ID!) {
    deleteAssignment(id: $id)
  }
`;

export default function Home() {
  // --- STATE MANAGEMENT ---
  // REST API State (Mahasiswa)
  const [students, setStudents] = useState([]);
  const [studentLoading, setStudentLoading] = useState(true);
  const [newStudent, setNewStudent] = useState({ name: '', email: '', age: '' });

  // GraphQL State (Akademik)
  const [activeTab, setActiveTab] = useState('jadwal'); // 'jadwal' or 'tugas'
  const [newCourse, setNewCourse] = useState({ code: '', name: '', lecturer: '', day: 'Senin', time: '' });
  const [newAssignment, setNewAssignment] = useState({ courseId: '', title: '', deadline: '' });

  // --- API HOOKS ---
  const { data: academicData, loading: academicLoading, refetch: refetchAcademic } = useQuery(GET_ACADEMIC_DATA);
  const [addCourse] = useMutation(ADD_COURSE);
  const [addAssignment] = useMutation(ADD_ASSIGNMENT);
  const [updateStatus] = useMutation(UPDATE_ASSIGNMENT_STATUS);
  const [deleteAssignment] = useMutation(DELETE_ASSIGNMENT);

  // --- EFFECS & HANDLERS ---
  
  // 1. Fetch Students (REST API)
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await userApi.getUsers();
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setStudentLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userApi.createUser({
        name: newStudent.name,
        email: newStudent.email,
        age: parseInt(newStudent.age)
      });
      setNewStudent({ name: '', email: '', age: '' });
      fetchStudents();
    } catch (error) {
      alert('Gagal menambah mahasiswa');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if(!confirm('Hapus mahasiswa ini?')) return;
    try {
      await userApi.deleteUser(id);
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  // 2. GraphQL Handlers
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCourse({ variables: newCourse });
      setNewCourse({ code: '', name: '', lecturer: '', day: 'Senin', time: '' });
      refetchAcademic();
      alert('Mata kuliah berhasil ditambahkan!');
    } catch (error) {
      console.error(error);
      alert('Gagal menambah mata kuliah');
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAssignment({ variables: newAssignment });
      setNewAssignment({ courseId: '', title: '', deadline: '' });
      refetchAcademic();
    } catch (error) {
      console.error(error);
      alert('Gagal menambah tugas. Pastikan Course ID benar.');
    }
  };

  const toggleAssignmentStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Pending' ? 'Selesai' : 'Pending';
    await updateStatus({ variables: { id, status: newStatus } });
    refetchAcademic(); // Refresh data agar UI update
  };

  const handleDeleteAssignment = async (id: string) => {
    if(!confirm('Hapus tugas ini?')) return;
    await deleteAssignment({ variables: { id } });
    refetchAcademic();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <nav className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🎓 KuliahMate <span className="text-sm font-normal opacity-80 bg-indigo-700 px-2 py-1 rounded">Microservices Demo</span>
          </h1>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI: REST API (Data Mahasiswa) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              👥 Data Mahasiswa
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">REST API</span>
            </h2>
            
            {/* Form Tambah Mahasiswa */}
            <form onSubmit={handleCreateStudent} className="space-y-3 mb-6 bg-gray-50 p-4 rounded-lg">
              <input
                type="text"
                placeholder="Nama Lengkap"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  placeholder="Email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  className="w-full text-sm border-gray-300 rounded-md p-2 border"
                  required
                />
                <input
                  type="number"
                  placeholder="Umur"
                  value={newStudent.age}
                  onChange={(e) => setNewStudent({ ...newStudent, age: e.target.value })}
                  className="w-full text-sm border-gray-300 rounded-md p-2 border"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-md transition">
                + Tambah Mahasiswa
              </button>
            </form>

            {/* List Mahasiswa */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {studentLoading ? <p className="text-center text-gray-500 text-sm">Loading...</p> : students.map((user: any) => (
                <div key={user.id} className="flex justify-between items-start p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition">
                  <div>
                    <p className="font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">{user.role || 'Mahasiswa'}</span>
                  </div>
                  <button onClick={() => handleDeleteStudent(user.id)} className="text-red-400 hover:text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: GRAPHQL (Jadwal & Tugas) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b">
              <button 
                onClick={() => setActiveTab('jadwal')}
                className={`flex-1 py-4 text-center font-medium transition ${activeTab === 'jadwal' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📅 Jadwal Kuliah
              </button>
              <button 
                onClick={() => setActiveTab('tugas')}
                className={`flex-1 py-4 text-center font-medium transition ${activeTab === 'tugas' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📝 Tugas & Deadline
              </button>
            </div>

            <div className="p-6">
              {/* TAB JADWAL KULIAH */}
              {activeTab === 'jadwal' && (
                <div className="space-y-6">
                   <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700">Daftar Mata Kuliah</h3>
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full border border-pink-200">GraphQL Query</span>
                  </div>

                  {/* Form Tambah Jadwal */}
                  <form onSubmit={handleAddCourse} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <input className="md:col-span-1 p-2 border rounded text-sm" placeholder="Kode (IF301)" value={newCourse.code} onChange={e => setNewCourse({...newCourse, code: e.target.value})} required />
                    <input className="md:col-span-2 p-2 border rounded text-sm" placeholder="Nama Mata Kuliah" value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value})} required />
                    <select className="md:col-span-1 p-2 border rounded text-sm" value={newCourse.day} onChange={e => setNewCourse({...newCourse, day: e.target.value})}>
                      {['Senin','Selasa','Rabu','Kamis','Jumat'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input className="md:col-span-1 p-2 border rounded text-sm" placeholder="Jam (08:00)" value={newCourse.time} onChange={e => setNewCourse({...newCourse, time: e.target.value})} required />
                    <input className="md:col-span-5 p-2 border rounded text-sm" placeholder="Nama Dosen" value={newCourse.lecturer} onChange={e => setNewCourse({...newCourse, lecturer: e.target.value})} required />
                    <button className="md:col-span-5 bg-indigo-600 text-white py-2 rounded text-sm font-medium hover:bg-indigo-700 transition">Simpan Jadwal</button>
                  </form>

                  {/* List Jadwal */}
                  {academicLoading ? <p>Loading...</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {academicData?.courses.map((course: any) => (
                        <div key={course.id} className="border-l-4 border-indigo-500 bg-white shadow-sm p-4 rounded border border-gray-100">
                          <div className="flex justify-between">
                            <h4 className="font-bold text-gray-800">{course.name}</h4>
                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{course.code}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">👨‍🏫 {course.lecturer}</p>
                          <div className="mt-3 flex items-center text-xs text-gray-500 gap-3">
                            <span className="flex items-center gap-1">🗓️ {course.day}</span>
                            <span className="flex items-center gap-1">⏰ {course.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB TUGAS */}
              {activeTab === 'tugas' && (
                <div className="space-y-6">
                   <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700">Daftar Tugas</h3>
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full border border-pink-200">GraphQL Mutation</span>
                  </div>

                  {/* Form Tambah Tugas */}
                  <form onSubmit={handleAddAssignment} className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select 
                        className="p-2 border rounded text-sm" 
                        value={newAssignment.courseId} 
                        onChange={e => setNewAssignment({...newAssignment, courseId: e.target.value})}
                        required
                      >
                        <option value="">-- Pilih Mata Kuliah --</option>
                        {academicData?.courses.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input type="date" className="p-2 border rounded text-sm" value={newAssignment.deadline} onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})} required />
                    </div>
                    <input className="w-full p-2 border rounded text-sm" placeholder="Judul Tugas (misal: Laporan Praktikum)" value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} required />
                    <button className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition">Tambah Tugas</button>
                  </form>

                  {/* List Tugas */}
                  <div className="space-y-2">
                    {academicData?.assignments.length === 0 && <p className="text-center text-gray-400 py-4">Belum ada tugas</p>}
                    {academicData?.assignments.map((tugas: any) => (
                      <div key={tugas.id} className={`flex items-center justify-between p-4 rounded-lg border transition ${tugas.status === 'Selesai' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-blue-100 shadow-sm'}`}>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => toggleAssignmentStatus(tugas.id, tugas.status)}
                            className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${tugas.status === 'Selesai' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500'}`}
                          >
                            {tugas.status === 'Selesai' && '✓'}
                          </button>
                          <div>
                            <h4 className={`font-medium ${tugas.status === 'Selesai' ? 'line-through text-gray-500' : 'text-gray-800'}`}>{tugas.title}</h4>
                            <p className="text-xs text-gray-500">
                              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-2">{tugas.course?.name || 'Umum'}</span>
                              Deadline: {tugas.deadline}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteAssignment(tugas.id)} className="text-gray-400 hover:text-red-500 px-2">
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}