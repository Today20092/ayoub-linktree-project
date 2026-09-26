package xyz.ayoubabed.gallery

import android.content.res.Configuration
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.time.LocalDate

class GalleryPickerThemeTest {
    @get:Rule val compose = createComposeRule()

    @Test fun calendarFollowsDarkSystemTheme() = checkCalendar(true)
    @Test fun calendarFollowsLightSystemTheme() = checkCalendar(false)

    @OptIn(ExperimentalMaterial3Api::class)
    private fun checkCalendar(dark: Boolean) {
        var luminance = -1f
        compose.setContent {
            val configuration = Configuration(LocalConfiguration.current).apply {
                uiMode = (uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or
                    if (dark) Configuration.UI_MODE_NIGHT_YES else Configuration.UI_MODE_NIGHT_NO
            }
            CompositionLocalProvider(LocalConfiguration provides configuration) {
                GalleryTheme {
                    luminance = DatePickerDefaults.colors().containerColor.luminance()
                    GalleryDateDialog(LocalDate.of(2026, 9, 26), {}, {})
                }
            }
        }
        compose.onNodeWithText("Continue").assertIsDisplayed()
        compose.onNodeWithText("Cancel").assertIsDisplayed()
        compose.runOnIdle { assertTrue(if (dark) luminance < 0.3f else luminance > 0.7f) }
    }
}
