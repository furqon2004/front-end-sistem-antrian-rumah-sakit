/**
 * Doctor Schedules Composable
 * Fetches and organizes doctor schedules by poly for weekly display
 */
export const useDoctorSchedules = () => {
  const { baseURL } = useApi()
  
  const doctors = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  // Day names in Indonesian
  const dayNames = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu',
    7: 'Minggu'
  }
  
  // Fetch doctors data
  const fetchDoctors = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/v1/customer/info/doctors', { baseURL })
      doctors.value = response?.data || []
      return doctors.value
    } catch (err) {
      console.error('Failed to fetch doctors:', err)
      error.value = err
      return []
    } finally {
      loading.value = false
    }
  }
  
  // Get schedules organized by day for a specific poly
  const getSchedulesByPoly = (polyId) => {
    // Initialize schedule for all days (1-7)
    const weeklySchedule = {}
    for (let day = 1; day <= 7; day++) {
      weeklySchedule[day] = {
        dayNumber: day,
        dayName: dayNames[day],
        doctors: []
      }
    }
    
    // Filter doctors by poly and organize by day
    const polyDoctors = doctors.value.filter(doc => doc.poly_id === polyId)
    
    polyDoctors.forEach(doctor => {
      if (doctor.schedules && Array.isArray(doctor.schedules)) {
        doctor.schedules.forEach(schedule => {
          const dayNum = schedule.day_of_week
          if (dayNum >= 1 && dayNum <= 7) {
            weeklySchedule[dayNum].doctors.push({
              id: doctor.id,
              name: doctor.name,
              specialization: doctor.specialization,
              sipNumber: doctor.sip_number,
              startTime: schedule.start_time?.substring(0, 5) || schedule.start_time,
              endTime: schedule.end_time?.substring(0, 5) || schedule.end_time,
              maxQuota: schedule.max_quota,
              remainingQuota: schedule.remaining_quota
            })
          }
        })
      }
    })
    
    // Sort doctors by start time within each day
    Object.values(weeklySchedule).forEach(day => {
      day.doctors.sort((a, b) => a.startTime.localeCompare(b.startTime))
    })
    
    return weeklySchedule
  }
  
  // Get poly information from doctors data
  const getPolyInfo = (polyId) => {
    const doctor = doctors.value.find(doc => doc.poly_id === polyId)
    return doctor?.poly || null
  }
  
  // Get all unique polys
  const getAllPolys = () => {
    const polysMap = new Map()
    doctors.value.forEach(doctor => {
      if (doctor.poly && !polysMap.has(doctor.poly_id)) {
        polysMap.set(doctor.poly_id, doctor.poly)
      }
    })
    return Array.from(polysMap.values())
  }
  
  return {
    doctors,
    loading,
    error,
    dayNames,
    fetchDoctors,
    getSchedulesByPoly,
    getPolyInfo,
    getAllPolys
  }
}
