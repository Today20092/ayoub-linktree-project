package xyz.ayoubabed.gallery

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class GalleryCreatorTest {
    @get:Rule val compose = createComposeRule()

    @Test fun createsHiddenGalleryAndKeepsDetailsAfterError() {
        var submitted: JSONObject? = null
        var created: Gallery? = null
        var fail = true
        compose.setContent { GalleryTheme {
            GalleryCreator({}, { created = it }) { input ->
                submitted = input
                if (fail) throw ApiException(403, "Enable gallery management to create galleries.")
                Gallery(input.getString("slug"), input.getString("title"), input.getString("category"), input.getString("visibilityStatus"))
            }
        } }
        compose.onNodeWithText("Create gallery").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithText("Gallery name").performScrollTo().performTextInput("Camera event")
        compose.onNodeWithText("About this gallery").performScrollTo().performTextInput("An event from my phone")
        compose.onNodeWithText("Create gallery").performScrollTo().performClick()
        compose.onNodeWithText("Enable gallery management to create galleries.").performScrollTo().assertIsDisplayed()
        val firstSlug = submitted!!.getString("slug")
        compose.runOnIdle { fail = false }
        compose.onNodeWithText("Create gallery").performScrollTo().performClick()
        compose.runOnIdle {
            assertEquals("Camera event", created?.title)
            assertEquals("hidden", created?.status)
            assertEquals(firstSlug, created?.id)
        }
    }
}
