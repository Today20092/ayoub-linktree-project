package xyz.ayoubabed.gallery

import android.graphics.Bitmap
import android.content.ContentValues
import android.provider.MediaStore
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class GalleryAppTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @Test fun onboardingAndNavigation() {
        compose.onNodeWithText("Your galleries").assertIsDisplayed()
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
        val resolver = compose.activity.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "$name.png")
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/AyoubGalleryChecks")
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val uri = checkNotNull(resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values))
        checkNotNull(resolver.openOutputStream(uri)).use { output ->
            compose.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, output)
        }
        resolver.update(uri, ContentValues().apply { put(MediaStore.Images.Media.IS_PENDING, 0) }, null, null)
    }
}
