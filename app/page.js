"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserPlus, FileDown, Search, CheckCircle, XCircle } from 'lucide-react';

// Supabase Setup (Directly yahan bhi kar sakte ho agar lib file mein issue ho)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CommitteeApp() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [search, setSearch] = useState('');

  // 1. Data Load
  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    const { data } = await supabase
      .from('payments')
      .select('*, members(full_name, phone_number)')
      .order('id', { ascending: true });
    if (data) setMembers(data);
    setLoading(false);
  }

  // 2. Add Member
  async function addMember() {
    if (!newName || !newPhone) return alert("Naam aur Phone likho!");
    
    // Member Table Entry
    const { data: member, error } = await supabase
      .from('members')
      .insert([{ full_name: newName, phone_number: newPhone }])
      .select().single();

    if (error) return alert(error.message);

    // Payment Table Entry
    await supabase.from('payments').insert([{
      member_id: member.id,
      amount: 2000,
      status: 'no',
      session_id: 1
    }]);

    setNewName(''); setNewPhone('');
    fetchMembers();
  }

  // 3. Status Toggle
  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'yes' ? 'no' : 'yes';
    setMembers(members.map(m => m.id === id ? {...m, status: newStatus} : m));
    await supabase.from('payments').update({ status: newStatus }).eq('id', id);
  }

  // 4. PDF Download
  function downloadPDF() {
    const doc = new jsPDF();
    doc.text("Committee Report", 14, 20);
    
    const rows = members.map(m => [
      m.members.full_name, 
      m.members.phone_number, 
      "2000", 
      m.status.toUpperCase()
    ]);

    doc.autoTable({
      head: [['Name', 'Phone', 'Amount', 'Status']],
      body: rows,
      startY: 30,
    });

    doc.save('Committee_List.pdf');
  }

  const filtered = members.filter(m => m.members?.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow mb-6">
          <h1 className="text-2xl font-bold">Committee Manager</h1>
          <button onClick={downloadPDF} className="bg-green-600 text-white px-4 py-2 rounded flex gap-2">
            <FileDown size={20}/> Download PDF
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex gap-2">
            <input className="border p-2 rounded w-full" placeholder="Name" value={newName} onChange={e=>setNewName(e.target.value)} />
            <input className="border p-2 rounded w-full" placeholder="Phone" value={newPhone} onChange={e=>setNewPhone(e.target.value)} />
            <button onClick={addMember} className="bg-blue-600 text-white px-6 rounded"><UserPlus/></button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <input className="w-full p-4 border-b" placeholder="Search..." onChange={e=>setSearch(e.target.value)} />
          {loading ? <p className="p-4">Loading...</p> : 
            <table className="w-full text-left">
              <thead className="bg-gray-800 text-white">
                <tr><th className="p-4">Name</th><th className="p-4">Phone</th><th className="p-4">Status</th></tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b">
                    <td className="p-4">{m.members?.full_name}</td>
                    <td className="p-4">{m.members?.phone_number}</td>
                    <td className="p-4">
                      <button onClick={()=>toggleStatus(m.id, m.status)} 
                        className={`px-3 py-1 rounded text-white ${m.status==='yes'?'bg-green-500':'bg-red-500'}`}>
                        {m.status==='yes' ? 'PAID' : 'UNPAID'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  );
}
