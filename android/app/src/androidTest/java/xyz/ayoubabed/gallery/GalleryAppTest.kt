package xyz.ayoubabed.gallery

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class GalleryAppTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @Test fun onboardingAndNavigation() {
        compose.onNodeWithText("From camera\nto gallery.").assertIsDisplayed()
        capture("galleries")
        compose.onNodeWithText("Connect your website").performClick()
        compose.onNodeWithText("Make the connection").assertIsDisplayed()
        compose.onNodeWithText("Website address").assertExists()
        capture("settings")
        compose.onNodeWithText("Uploads").performClick()
        compose.onNodeWithText("Your upload queue").assertIsDisplayed()
        capture("uploads")
    }

    private fun capture(name: String) {
        compose.waitForIdle()
        val directory = File(compose.activity.getExternalFilesDir(null), "screenshots").apply { mkdirs() }
        File(directory, "$name.png").outputStream().use { output ->
            compose.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, output)
        }
    }
}
