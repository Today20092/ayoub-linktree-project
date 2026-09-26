package xyz.ayoubabed.gallery

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId
import java.time.LocalTime
import java.util.TimeZone

class GalleryDateTimeTest {
    @Test fun pickerDatesDoNotShiftAcrossPhoneTimezones() {
        val original = TimeZone.getDefault()
        try {
            for (zone in listOf("America/New_York", "Pacific/Honolulu", "Pacific/Kiritimati")) {
                TimeZone.setDefault(TimeZone.getTimeZone(zone))
                val date = LocalDate.of(2026, 9, 26)
                assertEquals(date, pickerLocalDate(pickerDateMillis(date)))
                val timestamp = pickerLocalDate(pickerDateMillis(date)).atTime(LocalTime.of(18, 30)).atZone(ZoneId.systemDefault())
                assertEquals(date, timestamp.toLocalDate())
                assertEquals(18, timestamp.hour)
            }
        } finally { TimeZone.setDefault(original) }
    }
}
